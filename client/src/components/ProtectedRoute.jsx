import { Navigate, Outlet, useLocation } from 'react-router-dom';
import useAuthStore from '../store/authStore';

function ProtectedRoute({ children, allowedRoles }) {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const location = useLocation();

  if (!token || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Not Authorized</h2>
          <p className="text-gray-600 mb-4">You do not have access to this page.</p>
          <a href="/" className="inline-block bg-blue-600 text-white px-4 py-2 rounded-lg">Go to dashboard</a>
        </div>
      </div>
    );
  }

  return children ? children : <Outlet />;
}

export default ProtectedRoute;
