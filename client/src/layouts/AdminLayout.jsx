import { Outlet, Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

function AdminLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-blue-600">InternHub</h1>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">ADMIN</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/admin" className="text-sm text-gray-600 hover:text-blue-600">Dashboard</Link>
            <Link to="/admin/mentors" className="text-sm text-gray-600 hover:text-blue-600">Mentors</Link>
            <Link to="/admin/cohorts" className="text-sm text-gray-600 hover:text-blue-600">Cohorts</Link>
            <Link to="/admin/interns" className="text-sm text-gray-600 hover:text-blue-600">Interns</Link>
            <span className="text-sm text-gray-700 font-medium">{user?.name}</span>
            <button onClick={handleLogout} className="text-sm bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 transition">Logout</button>
          </div>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 py-8"><Outlet /></main>
    </div>
  );
}

export default AdminLayout;
