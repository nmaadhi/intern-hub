import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';

function StatCard({ label, value, color, to }) {
  const content = (
    <div className={`bg-white rounded-2xl shadow-sm p-6 border-l-4 ${color} hover:shadow-md transition`}>
      <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">{label}</p>
      <p className="text-4xl font-bold text-gray-800 mt-2">{value}</p>
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
}

function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ mentorCount: 0, cohortCount: 0, internCount: 0 });
  const [cohorts, setCohorts] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [mentorsRes, cohortsRes, internsRes] = await Promise.all([
          api.get('/admin/mentors'),
          api.get('/admin/cohorts'),
          api.get('/admin/interns'),
        ]);
        const cohortsList = cohortsRes.data.cohorts || [];
        setStats({
          mentorCount: mentorsRes.data.count || 0,
          cohortCount: cohortsList.length,
          internCount: internsRes.data.count || 0,
        });
        setCohorts(cohortsList);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-500">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Admin Dashboard</h2>
        <p className="text-gray-600 text-sm mt-1">Overview of your InternHub organization</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Mentors" value={stats.mentorCount} color="border-blue-500" to="/admin/mentors" />
        <StatCard label="Cohorts" value={stats.cohortCount} color="border-purple-500" to="/admin/cohorts" />
        <StatCard label="Interns" value={stats.internCount} color="border-emerald-500" to="/admin/interns" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">Cohorts Overview</h3>
        {cohorts.length === 0 ? (
          <p className="text-gray-500 text-sm">No cohorts yet. <Link to="/admin/cohorts" className="text-blue-600 hover:underline">Create one</Link>.</p>
        ) : (
          <div className="space-y-3">
            {cohorts.map((c) => (
              <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-800">{c.name}</p>
                  <p className="text-xs text-gray-500">{c.mentor ? c.mentor.name : 'No mentor assigned'} - {c.internCount} intern{c.internCount !== 1 ? 's' : ''}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${c.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>{c.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;