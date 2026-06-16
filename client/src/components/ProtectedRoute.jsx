import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

/**
 * Wrapper that only renders its children if the user is authenticated.
 * Optionally restricts access to specific role(s).
 *
 * Usage:
 *   <ProtectedRoute>                       → any logged-in user
 *     <Dashboard />
 *   </ProtectedRoute>
 *
 *   <ProtectedRoute allowedRoles={['ADMIN']}>   → only admins
 *     <AdminPanel />
 *   </ProtectedRoute>
 */
function ProtectedRoute({ children, allowedRoles }) {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  // Not logged in → send to login page
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  // Role restriction (optional)
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Logged in, but wrong role → kick to login
    // (Later, we might redirect to a "no access" page instead)
    return <Navigate to="/login" replace />;
  }

  // All checks passed → render the actual page
  return children;
}

export default ProtectedRoute;