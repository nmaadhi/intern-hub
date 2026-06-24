import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';

function EyeIcon({ open }) {
  return open ? (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
    </svg>
  ) : (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function PasswordInput({ label, value, onChange, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          required
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm pr-12"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
        >
          <EyeIcon open={show} />
        </button>
      </div>
    </div>
  );
}

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password. Link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md text-center">
          <p className="text-red-600 font-medium">Invalid reset link.</p>
          <a href="/forgot-password" className="text-purple-600 hover:underline text-sm mt-2 inline-block">
            Request a new one
          </a>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-md text-center">
          <div className="text-5xl mb-4">✅</div>
          <h3 className="text-xl font-bold text-gray-800">Password Reset!</h3>
          <p className="text-gray-500 text-sm mt-2">Redirecting to login in 3 seconds...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-black text-purple-600">InternHub</h1>
          <h2 className="text-xl font-bold text-gray-800 mt-2">Set New Password</h2>
          <p className="text-sm text-gray-500 mt-1">Choose a strong new password for your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <PasswordInput
            label="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
          <PasswordInput
            label="Confirm New Password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repeat new password"
          />

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 text-white py-3 rounded-xl hover:bg-purple-700 disabled:opacity-50 transition font-medium"
          >
            {loading ? 'Saving...' : 'Set New Password'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <a href="/login" className="text-sm text-gray-500 hover:text-purple-600">← Back to Login</a>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;