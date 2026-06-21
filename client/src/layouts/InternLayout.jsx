import { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import NotificationBell from '../components/NotificationBell';

function LogoutModal({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-80 mx-4">
        <div className="text-center">
          <div className="text-4xl mb-3">👋</div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">Logging out?</h3>
          <p className="text-sm text-gray-500 mb-6">You'll need to sign in again to access your dashboard.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition">
            Yes, Logout
          </button>
        </div>
      </div>
    </div>
  );
}

function InternLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleLogoutConfirm = () => {
    setShowLogoutModal(false);
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {showLogoutModal && (
        <LogoutModal
          onConfirm={handleLogoutConfirm}
          onCancel={() => setShowLogoutModal(false)}
        />
      )}
      <header className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/intern" className="text-xl font-bold text-emerald-600">InternHub</Link>
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">INTERN</span>
          </div>
          <nav className="flex items-center gap-3 flex-wrap">
            <Link to="/intern" className="text-sm text-gray-600 hover:text-emerald-600 transition">Dashboard</Link>
            <Link to="/intern/standup" className="text-sm text-gray-600 hover:text-emerald-600 transition">Standup</Link>
            <Link to="/intern/assignments" className="text-sm text-gray-600 hover:text-emerald-600 transition">Assignments</Link>
            <Link to="/intern/tasks" className="text-sm text-gray-600 hover:text-emerald-600 transition">Tasks</Link>
            <Link to="/intern/meetings" className="text-sm text-gray-600 hover:text-emerald-600 transition">Meetings</Link>
            <Link to="/intern/notes" className="text-sm text-gray-600 hover:text-emerald-600 transition">Notes</Link>
            <Link to="/intern/sprint" className="text-sm text-gray-600 hover:text-emerald-600 font-medium transition">🏃 Sprint</Link>
            <Link to="/intern/polls" className="text-sm text-gray-600 hover:text-emerald-600 transition">📊 Polls</Link>
            <Link to="/intern/profile" className="text-sm text-gray-600 hover:text-emerald-600 transition">Profile</Link>
            <Link to="/intern/announcements" className="text-sm text-gray-600 hover:text-emerald-600 transition">📢 Announcements</Link>
            
          </nav>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <span className="text-sm text-gray-600">{user?.name}</span>
            <button
              onClick={() => setShowLogoutModal(true)}
              className="text-sm bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 active:bg-red-700 transition font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}

export default InternLayout;