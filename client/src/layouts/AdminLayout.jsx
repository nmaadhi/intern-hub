import { Outlet, Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

function AdminLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin" className="text-xl font-bold text-blue-600">InternHub</Link>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">ADMIN</span>
          </div>
          <nav className="flex items-center gap-4 flex-wrap">
            <Link to="/admin" className="text-sm text-gray-600 hover:text-blue-600">Dashboard</Link>
            <Link to="/admin/mentors" className="text-sm text-gray-600 hover:text-blue-600">Mentors</Link>
            <Link to="/admin/cohorts" className="text-sm text-gray-600 hover:text-blue-600">Cohorts</Link>
            <Link to="/admin/interns" className="text-sm text-gray-600 hover:text-blue-600">Interns</Link>
            <Link to="/admin/sprints" className="text-sm text-gray-600 hover:text-blue-600 font-medium">🏃 Sprints</Link>
          </nav>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{user?.name}</span>
            <button onClick={handleLogout} className="text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition">Logout</button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;