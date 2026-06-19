import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import useAuthStore from '../../store/authStore';

function MentorDashboard() {
  const user = useAuthStore((s) => s.user);
  const [cohorts, setCohorts] = useState([]);
  const [internCount, setInternCount] = useState(0);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [cRes, iRes, aRes] = await Promise.all([
          api.get('/mentor/cohorts'),
          api.get('/mentor/interns'),
          api.get('/mentor/assignments'),
        ]);
        setCohorts(cRes.data.cohorts || []);
        setInternCount(iRes.data.count || 0);
        setAssignments(aRes.data.assignments || []);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-500">Loading...</div>;
  if (error) return <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700">{error}</div>;

  const pendingReviews = assignments.reduce(
    (sum, a) => sum + (a.submittedCount - a.approvedCount - a.needsRevisionCount),
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Welcome, {user?.name}</h2>
        <p className="text-gray-600 text-sm mt-1">Your mentor dashboard</p>
      </div>

      {cohorts.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <h3 className="font-bold text-amber-900">No cohorts assigned yet</h3>
          <p className="text-sm text-amber-700 mt-1">Ask an admin to assign you to a cohort. Once assigned, your interns will appear here.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl shadow-sm p-6 border-l-4 border-purple-500">
              <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">My Cohorts</p>
              <p className="text-4xl font-bold text-gray-800 mt-2">{cohorts.length}</p>
            </div>
            <Link to="/mentor/interns" className="bg-white rounded-2xl shadow-sm p-6 border-l-4 border-emerald-500 hover:shadow-md transition">
              <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Total Interns</p>
              <p className="text-4xl font-bold text-gray-800 mt-2">{internCount}</p>
            </Link>
            <Link to="/mentor/assignments" className="bg-white rounded-2xl shadow-sm p-6 border-l-4 border-blue-500 hover:shadow-md transition">
              <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Assignments</p>
              <p className="text-4xl font-bold text-gray-800 mt-2">{assignments.length}</p>
            </Link>
            <Link to="/mentor/assignments" className="bg-white rounded-2xl shadow-sm p-6 border-l-4 border-amber-500 hover:shadow-md transition">
              <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">Pending Reviews</p>
              <p className="text-4xl font-bold text-gray-800 mt-2">{pendingReviews}</p>
            </Link>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">My Cohorts</h3>
            <div className="space-y-3">
              {cohorts.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.internCount} intern{c.internCount !== 1 ? 's' : ''}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${c.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>{c.status}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-2xl p-6 border border-purple-100">
        <h3 className="text-lg font-bold text-gray-800 mb-2">Coming Soon</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li>- Kanban-style task tracking per intern</li>
          <li>- Schedule meetings (Google Meet integration)</li>
          <li>- Comment threads on submissions</li>
          <li>- Progress reports and analytics</li>
        </ul>
        <p className="text-xs text-gray-500 mt-4">These features arrive on Day 4+.</p>
      </div>
    </div>
  );
}

export default MentorDashboard;