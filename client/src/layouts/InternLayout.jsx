import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import NotificationBell from '../components/NotificationBell';
import { useTheme } from '../hooks/useTheme';

const NAV = [
  { to: '/intern', label: 'Dashboard', icon: '🏠', exact: true },
  { to: '/intern/standup', label: 'Standup', icon: '📋' },
  { to: '/intern/assignments', label: 'Assignments', icon: '📝' },
  { to: '/intern/tasks', label: 'Tasks', icon: '✅' },
  { to: '/intern/meetings', label: 'Meetings', icon: '📅' },
  { to: '/intern/notes', label: 'Notes', icon: '📒' },
  { to: '/intern/sprint', label: 'Sprint', icon: '🏃' },
  { to: '/intern/polls', label: 'Polls', icon: '📊' },
  { to: '/intern/announcements', label: 'Announcements', icon: '📢' },
  { to: '/intern/quizzes', label: 'Quizzes', icon: '🧠' },
  { to: '/intern/chat', label: 'Chat', icon: '💬' },
  { to: '/intern/profile', label: 'Profile', icon: '👤' },
];

function LogoutModal({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm">
        <div className="text-center">
          <div className="text-5xl mb-4">👋</div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Logging out?</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">You will need to sign in again to access your dashboard.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition">
            Cancel
          </button>
          <button onClick={onConfirm}
            className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition">
            Yes, Logout
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InternLayout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const location = useLocation();
  const { dark, toggle } = useTheme();
  const [showLogout, setShowLogout] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    setShowLogout(false);
    logout();
    navigate('/login', { replace: true });
  };

  const isActive = (to, exact) => exact ? location.pathname === to : location.pathname.startsWith(to);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex transition-colors duration-200">
      {showLogout && <LogoutModal onConfirm={handleLogout} onCancel={() => setShowLogout(false)} />}

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 z-30 flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100 dark:border-gray-800">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-sm">IH</span>
          </div>
          <div>
            <p className="font-bold text-gray-900 dark:text-white text-sm">InternHub</p>
            <span className="text-xs bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded font-medium">INTERN</span>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map((item) => (
            <Link key={item.to} to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive(item.to, item.exact)
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
              }`}>
              <span className="text-base">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="px-3 py-4 border-t border-gray-100 dark:border-gray-800 space-y-1">
          <Link to="/change-password"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition">
            <span>🔑</span> Change Password
          </Link>
          <button onClick={() => setShowLogout(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition">
            <span>🚪</span> Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <header className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between gap-3">
          <button onClick={() => setSidebarOpen(true)}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition">
            ☰
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <button onClick={toggle}
              className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition text-base">
              {dark ? '☀️' : '🌙'}
            </button>
            <NotificationBell />
            <div className="flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-gray-700">
              <div className="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/50 rounded-full flex items-center justify-center">
                <span className="text-emerald-700 dark:text-emerald-300 font-bold text-xs">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-gray-900 dark:text-white leading-none">{user?.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{user?.internId}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}