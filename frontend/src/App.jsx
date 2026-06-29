import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import useAuthStore from './store/useAuthStore';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './pages/Login';
import DashboardGuru from './pages/DashboardGuru';
import DashboardSiswa from './pages/DashboardSiswa';
import AdminLayout from './pages/admin/AdminLayout';
import ManageStudents from './pages/admin/ManageStudents';
import ManageClasses from './pages/admin/ManageClasses';
import ManageUsers from './pages/admin/ManageUsers';
import RegisterFace from './pages/admin/RegisterFace';
import ManageFaceUpdates from './pages/admin/ManageFaceUpdates';
import AttendanceReport from './pages/AttendanceReport';
import Navbar from './components/Navbar';

/* ──────────────────────────────────────────────
   Animated loading screen shown while
   auth state is being resolved
   ────────────────────────────────────────────── */
function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0a0e1a] transition-opacity duration-700">
      {/* Ambient glow rings */}
      <div className="absolute h-72 w-72 rounded-full bg-gradient-to-br from-indigo-600/20 to-purple-600/20 blur-3xl animate-pulse" />
      <div className="absolute h-48 w-48 rounded-full bg-gradient-to-tr from-purple-500/10 to-indigo-500/10 blur-2xl animate-pulse [animation-delay:400ms]" />

      {/* Face-scan icon */}
      <div className="relative flex items-center justify-center">
        {/* Outer spinning ring */}
        <div className="absolute h-28 w-28 rounded-full border-[3px] border-transparent border-t-indigo-500 border-r-purple-500 animate-spin" />

        {/* Inner pulsing circle */}
        <div className="absolute h-20 w-20 rounded-full bg-gradient-to-br from-indigo-600/30 to-purple-600/30 animate-ping [animation-duration:2s]" />

        {/* Face scan SVG */}
        <svg
          className="relative z-10 h-14 w-14 text-indigo-400 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Corner brackets – face scan frame */}
          <path d="M7 3H5a2 2 0 0 0-2 2v2" />
          <path d="M17 3h2a2 2 0 0 1 2 2v2" />
          <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
          <path d="M17 21h2a2 2 0 0 0 2-2v-2" />
          {/* Simple face */}
          <circle cx="9" cy="10" r="0.75" fill="currentColor" stroke="none" />
          <circle cx="15" cy="10" r="0.75" fill="currentColor" stroke="none" />
          <path d="M9.5 15a3.5 3.5 0 0 0 5 0" />
          {/* Scan line */}
          <line
            x1="3"
            y1="12"
            x2="21"
            y2="12"
            className="animate-[scanLine_2s_ease-in-out_infinite] origin-center"
            strokeDasharray="2 2"
            strokeOpacity="0.5"
          />
        </svg>
      </div>

      {/* Loading text */}
      <p className="mt-10 text-sm font-medium tracking-widest text-gray-500 uppercase animate-pulse">
        Memuat...
      </p>

      {/* Inline keyframes for the scan-line animation */}
      <style>{`
        @keyframes scanLine {
          0%, 100% { transform: translateY(-8px); opacity: 0.3; }
          50%      { transform: translateY(8px);  opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}

/* ──────────────────────────────────────────────
   Role-aware root redirect
   ────────────────────────────────────────────── */
function RootRedirect() {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  if (user.role === 'siswa') {
    return <Navigate to="/dashboard/siswa" replace />;
  }

  return <Navigate to="/guru/dashboard" replace />;
}

/* ──────────────────────────────────────────────
   Login guard – redirect away if already
   authenticated
   ────────────────────────────────────────────── */
function LoginGuard() {
  const { user, isAuthenticated } = useAuthStore();

  if (isAuthenticated && user) {
    if (user.role === 'admin') {
      return <Navigate to="/admin" replace />;
    }
    if (user.role === 'siswa') {
      return <Navigate to="/dashboard/siswa" replace />;
    }
    return <Navigate to="/guru/dashboard" replace />;
  }

  return <Login />;
}

/* ──────────────────────────────────────────────
   Guru Report Layout – wraps AttendanceReport
   with Navbar for standalone guru route
   ────────────────────────────────────────────── */
function GuruReportLayout() {
  return (
    <div className="min-h-screen bg-[#0a0e1a] font-['Inter',sans-serif]">
      <Navbar title="Laporan Absensi" />
      <main className="p-4 md:p-6">
        <div className="mb-4">
          <a href="/guru/dashboard" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
            ← Kembali ke Dashboard
          </a>
        </div>
        <AttendanceReport />
      </main>
    </div>
  );
}

/* ──────────────────────────────────────────────
   App – entry point
   ────────────────────────────────────────────── */
export default function App() {
  const { loadAuth, isLoading } = useAuthStore();

  useEffect(() => {
    loadAuth();
  }, [loadAuth]);

  /* Show beautiful loading screen while auth resolves */
  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-[#0a0e1a] font-sans text-white antialiased">
      <Routes>
        {/* Public ──────────────────────────── */}
        <Route path="/login" element={<LoginGuard />} />

        {/* Guru ────────────────────────────── */}
        <Route
          path="/guru/dashboard"
          element={
            <ProtectedRoute allowedRoles={['guru', 'admin']}>
              <DashboardGuru />
            </ProtectedRoute>
          }
        />

        {/* Laporan Absensi (Guru) */}
        <Route
          path="/guru/laporan"
          element={
            <ProtectedRoute allowedRoles={['guru', 'admin']}>
              <GuruReportLayout />
            </ProtectedRoute>
          }
        />

        {/* Siswa ───────────────────────────── */}
        <Route
          path="/dashboard/siswa"
          element={
            <ProtectedRoute allowedRoles={['siswa']}>
              <DashboardSiswa />
            </ProtectedRoute>
          }
        />

        {/* Admin (nested) ──────────────────── */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/students" replace />} />
          <Route path="students" element={<ManageStudents />} />
          <Route path="classes" element={<ManageClasses />} />
          <Route path="users" element={<ManageUsers />} />
          <Route path="face-register" element={<RegisterFace />} />
          <Route path="face-updates" element={<ManageFaceUpdates />} />
          <Route path="attendance-report" element={<AttendanceReport />} />
        </Route>

        {/* Root redirect ───────────────────── */}
        <Route path="/" element={<RootRedirect />} />

        {/* Catch-all ───────────────────────── */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}
