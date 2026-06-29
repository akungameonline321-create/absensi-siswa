import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';

const LoadingSpinner = () => (
  <div className="min-h-screen bg-[#0a0e1a] flex items-center justify-center">
    <div className="flex flex-col items-center gap-6">
      {/* Spinning rings */}
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-500 animate-spin" />
        <div
          className="absolute inset-2 rounded-full border-2 border-transparent border-t-purple-500 animate-spin"
          style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}
        />
        <div
          className="absolute inset-4 rounded-full border-2 border-transparent border-t-pink-500 animate-spin"
          style={{ animationDuration: '1.5s' }}
        />
        {/* Center dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 animate-pulse" />
        </div>
      </div>
      <p className="text-gray-400 text-sm font-medium tracking-wide animate-pulse">
        Memverifikasi akses...
      </p>
    </div>
  </div>
);

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, token, isLoading } = useAuthStore();
  const location = useLocation();

  // Show spinner while auth state is being determined
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Not authenticated — redirect to login
  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role-based access check
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user.role;

    if (!allowedRoles.includes(userRole)) {
      // Redirect to the appropriate dashboard based on role
      const dashboardMap = {
        admin: '/admin',
        guru: '/guru',
      };
      const fallback = dashboardMap[userRole] || '/login';
      return <Navigate to={fallback} replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
