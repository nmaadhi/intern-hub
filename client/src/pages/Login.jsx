import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import useAuthStore from '../store/authStore';

function Login() {
  // ── form fields ──
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  // ── UI state ──
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  // Called when the form is submitted
  const handleSubmit = async (e) => {
    e.preventDefault(); // prevent browser's default form submit (page reload)
    setError('');
    setLoading(true);

    try {
      const { data } = await api.post('/auth/login', {
        identifier,
        password,
      });

      // Save token + user to Zustand (and localStorage automatically)
      login(data.token, data.user);

      // Redirect to dashboard
      navigate('/dashboard');
    } catch (err) {
      // Show backend error or generic message
      const message =
        err.response?.data?.error || 'Something went wrong. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-blue-600">InternHub</h1>
          <p className="text-gray-500 mt-1">Sign in to your account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Identifier (email or intern ID) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email or Intern ID
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              autoComplete="username"
              placeholder="admin@internhub.com  or  INT-0564"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-blue-500
                         focus:border-transparent"
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="Enter your password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-blue-500
                         focus:border-transparent"
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium
                       hover:bg-blue-700 transition
                       disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;