import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Menu, X, Shield, BookOpen } from 'lucide-react';
import useAuthStore from '../store/useAuthStore';
import { disconnectSocket } from '../services/socket';

const roleBadge = {
  admin: {
    label: 'Admin',
    icon: Shield,
    classes: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  },
  guru: {
    label: 'Guru',
    icon: BookOpen,
    classes: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
  siswa: {
    label: 'Siswa',
    icon: BookOpen,
    classes: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  },
};

const Navbar = ({ onToggleSidebar, title }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = () => {
    disconnectSocket();
    logout();
    navigate('/login', { replace: true });
  };

  const initials = user?.nama
    ? user.nama
        .split(' ')
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
        .toUpperCase()
    : '??';

  const badge = roleBadge[user?.role] || roleBadge.guru;
  const BadgeIcon = badge.icon;

  return (
    <nav className="sticky top-0 z-50 w-full bg-white/5 backdrop-blur-xl border-b border-white/10 shadow-lg shadow-black/20">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        {/* Left — hamburger + brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-300"
            aria-label="Toggle sidebar"
          >
            <Menu size={22} />
          </button>

          <div className="flex items-center gap-2.5 select-none">
            {/* Logo SVG */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="w-5 h-5 text-white"
                stroke="currentColor"
                strokeWidth={1.8}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 3H5a2 2 0 0 0-2 2v4" />
                <path d="M15 3h4a2 2 0 0 1 2 2v4" />
                <path d="M9 21H5a2 2 0 0 1-2-2v-4" />
                <path d="M15 21h4a2 2 0 0 0 2-2v-4" />
                <circle cx="12" cy="10" r="3" />
                <path d="M7 17c0-2.2 2.2-4 5-4s5 1.8 5 4" />
              </svg>
            </div>
            <span className="hidden sm:block text-lg font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              AbsensiSMA
            </span>
          </div>
        </div>

        {/* Center — page title */}
        <h1 className="hidden md:block text-white/90 font-semibold text-base tracking-wide truncate max-w-xs lg:max-w-md">
          {title || 'Dashboard'}
        </h1>

        {/* Right — user area */}
        <div className="relative flex items-center gap-3">
          <button
            onClick={() => setShowDropdown((v) => !v)}
            className="flex items-center gap-3 p-1.5 pr-3 rounded-xl hover:bg-white/5 transition-all duration-300 group"
          >
            {/* Initials avatar */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-md shadow-purple-500/20 transition-transform duration-300 group-hover:scale-105">
              {initials}
            </div>
            <div className="hidden sm:flex flex-col items-start">
              <span className="text-sm font-medium text-white leading-tight truncate max-w-[120px]">
                {user?.nama || 'User'}
              </span>
              <span className="flex items-center gap-1 text-[11px] mt-0.5">
                <BadgeIcon size={10} className={badge.classes.split(' ').find((c) => c.startsWith('text-')) || 'text-gray-400'} />
                <span className={badge.classes.split(' ').find((c) => c.startsWith('text-')) || 'text-gray-400'}>
                  {badge.label}
                </span>
              </span>
            </div>
          </button>

          {/* Dropdown */}
          {showDropdown && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowDropdown(false)}
              />
              <div className="absolute right-0 top-14 z-50 w-64 bg-[#111827]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                {/* User info section */}
                <div className="px-4 py-4 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-base font-bold shadow-lg shadow-purple-500/20">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm truncate">
                        {user?.nama || 'User'}
                      </p>
                      <p className="text-gray-500 text-xs truncate">
                        {user?.username || ''}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg border ${badge.classes}`}
                    >
                      <BadgeIcon size={12} />
                      {badge.label}
                    </span>
                  </div>
                </div>

                {/* Logout */}
                <div className="p-2">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all duration-300 text-sm font-medium"
                  >
                    <LogOut size={16} />
                    Keluar
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
