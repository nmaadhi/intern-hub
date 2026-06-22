import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

function RoleRedirect() {
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);

  if (!token || !user) return <Navigate to="/login" replace />;

  // No forced password change — they can change via email link or forgot password
  if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
  if (user.role === 'MENTOR') return <Navigate to="/mentor" replace />;
  if (user.role === 'INTERN') return <Navigate to="/intern" replace />;

  return <Navigate to="/login" replace />;
}

export default RoleRedirect;