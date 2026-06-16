import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

function Dashboard() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top navigation bar */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl font-bold text-blue-600">InternHub</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 hidden sm:inline">
              {user?.name}
            </span>
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
              {user?.role}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm bg-red-500 text-white px-3 py-1.5 rounded-lg
                         hover:bg-red-600 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            Welcome, {user?.name}! 👋
          </h2>
          <p className="text-gray-600 mb-6">
            You are logged in as <strong>{user?.role}</strong>.
          </p>

          {/* User info card */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              Your Profile
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Name:</span>{' '}
                <span className="text-gray-800 font-medium">{user?.name}</span>
              </div>
              <div>
                <span className="text-gray-500">Email:</span>{' '}
                <span className="text-gray-800 font-medium">{user?.email}</span>
              </div>
              <div>
                <span className="text-gray-500">Role:</span>{' '}
                <span className="text-gray-800 font-medium">{user?.role}</span>
              </div>
              <div>
                <span className="text-gray-500">Status:</span>{' '}
                <span className="text-gray-800 font-medium">{user?.status}</span>
              </div>
              {user?.internId && (
                <div>
                  <span className="text-gray-500">Intern ID:</span>{' '}
                  <span className="text-gray-800 font-medium">{user.internId}</span>
                </div>
              )}
            </div>
          </div>

          {/* Coming soon banner */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <p className="text-sm text-blue-700">
              🚧 <strong>Coming soon:</strong> Role-specific dashboards, task management,
              submissions, and meetings. Day 1 complete! 🎉
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Dashboard;