import { Outlet, Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import NotificationBell from '../components/NotificationBell';

function InternLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/intern" className="text-xl font-bold text-emerald-600">InternHub</Link>
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">INTERN</span>
          </div>
          <nav className="flex items-center gap-3 flex-wrap">
            <Link to="/intern" className="text-sm text-gray-600 hover:text-emerald-600">Dashboard</Link>
            <Link to="/intern/assignments" className="text-sm text-gray-600 hover:text-emerald-600">Assignments</Link>
            <Link to="/intern/tasks" className="text-sm text-gray-600 hover:text-emerald-600">Tasks</Link>
            <Link to="/intern/meetings" className="text-sm text-gray-600 hover:text-emerald-600">Meetings</Link>
            <Link to="/intern/notes" className="text-sm text-gray-600 hover:text-emerald-600">Notes</Link>
            <Link to="/intern/sprint" className="text-sm text-gray-600 hover:text-emerald-600 font-medium">🏃 Sprint</Link>
            <Link to="/intern/profile" className="text-sm text-gray-600 hover:text-emerald-600">Profile</Link>
          </nav>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <span className="text-sm text-gray-600">{user?.name}</span>
            <button onClick={handleLogout} className="text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition">Logout</button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8"><Outlet /></main>
    </div>
  );
}

export default InternLayout;