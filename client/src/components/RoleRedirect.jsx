import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

function RoleRedirect() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);

  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }

  if (user.mustChangePassword) {
    return <Navigate to="/change-password" replace />;
  }

  if (user.role === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  }

  if (user.role === 'MENTOR') {
    return <Navigate to="/mentor" replace />;
  }

  if (user.role === 'INTERN') {
    return <Navigate to="/intern" replace />;
  }

  return <Navigate to="/login" replace />;
}

export default RoleRedirect;
