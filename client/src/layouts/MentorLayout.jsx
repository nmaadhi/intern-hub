import { Outlet, Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

function MentorLayout() {
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
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/mentor" className="text-xl font-bold text-purple-600">InternHub</Link>
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">MENTOR</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link to="/mentor" className="text-sm text-gray-600 hover:text-purple-600">Dashboard</Link>
            <Link to="/mentor/interns" className="text-sm text-gray-600 hover:text-purple-600">Interns</Link>
            <Link to="/mentor/assignments" className="text-sm text-gray-600 hover:text-purple-600">Assignments</Link>
            <Link to="/mentor/tasks" className="text-sm text-gray-600 hover:text-purple-600">Tasks</Link>
            <Link to="/mentor/meetings" className="text-sm text-gray-600 hover:text-purple-600">Meetings</Link>
            <Link to="/mentor/notes" className="text-sm text-gray-600 hover:text-purple-600">Notes</Link>
          </nav>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{user?.name}</span>
            <button onClick={handleLogout} className="text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition">Logout</button>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}

export default MentorLayout;