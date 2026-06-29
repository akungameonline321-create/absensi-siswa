// ============================================
// AdminLayout.jsx — Admin Layout Wrapper
// Sidebar + Navbar + Content area with Outlet
// ============================================

import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/useAuthStore';
import { getProfile } from '../../services/api';
import Navbar from '../../components/Navbar';
import Sidebar from '../../components/Sidebar';

export default function AdminLayout() {
  const navigate = useNavigate();
  const { user, token, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [verified, setVerified] = useState(false);

  // ── Verify admin role on mount ──
  useEffect(() => {
    const verifyRole = async () => {
      try {
        // Quick check from store first
        if (user?.role !== 'admin') {
          toast.error('Akses ditolak. Hanya admin yang diizinkan.', {
            style: { background: '#1f2937', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' },
          });
          navigate('/login', { replace: true });
          return;
        }

        // Verify with server
        const res = await getProfile();
        const serverUser = res.data;

        if (serverUser.role !== 'admin') {
          logout();
          navigate('/login', { replace: true });
          return;
        }

        setVerified(true);
      } catch (err) {
        toast.error('Sesi telah berakhir. Silakan login kembali.', {
          style: { background: '#1f2937', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' },
        });
        logout();
        navigate('/login', { replace: true });
      }
    };

    if (!token) {
      navigate('/login', { replace: true });
      return;
    }

    verifyRole();
  }, [token, user, navigate, logout]);

  // ── Close mobile sidebar on route change via click ──
  const handleNavigation = () => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  if (!verified) {
    return (
      <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">Memverifikasi akses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] font-['Inter',sans-serif]">
      {/* ── Mobile Overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`fixed top-0 left-0 h-full z-50 transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'}
        `}
      >
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          onNavigate={handleNavigation}
        />

        {/* Mobile Close Button */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-4 right-4 lg:hidden text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </aside>

      {/* ── Main Content Area ── */}
      <div
        className={`transition-all duration-300 ${
          sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
        }`}
      >
        {/* Navbar */}
        <Navbar onMenuClick={() => setSidebarOpen(true)} />

        {/* Page Content */}
        <main className="p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
