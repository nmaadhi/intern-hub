import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import useAuthStore from '../../store/authStore';

function MentorDashboard() {
  const user = useAuthStore((s) => s.user);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [cRes, iRes, aRes, tRes, mRes] = await Promise.all([
          api.get('/mentor/cohorts'),
          api.get('/mentor/interns'),
          api.get('/mentor/assignments'),
          api.get('/mentor/tasks'),
          api.get('/mentor/meetings'),
        ]);
        setData({
          cohorts: cRes.data.cohorts || [],
          internCount: iRes.data.count || 0,
          assignments: aRes.data.assignments || [],
          tasks: tRes.data.tasks || [],
          meetings: mRes.data.meetings || [],
        });
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

  const { cohorts, internCount, assignments, tasks, meetings } = data;

  const pendingReviews = assignments.reduce(
    (sum, a) => sum + (a.submittedCount - a.approvedCount - a.needsRevisionCount), 0
  );
  const todoTasks = tasks.filter((t) => t.status === 'TODO').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const nextMeeting = meetings.find((m) => !m.isPast);

  const fmtDateTime = (s) => s ? new Date(s).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Welcome, {user?.name}</h2>
        <p className="text-gray-600 text-sm mt-1">Your mentor dashboard</p>
      </div>

      {cohorts.length === 0 && internCount === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <h3 className="font-bold text-amber-900">No cohorts or interns assigned yet</h3>
          <p className="text-sm text-amber-700 mt-1">Ask an admin to assign you to a cohort or assign interns directly to you.</p>
        </div>
      ) : (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <Link to="/mentor/interns" className="bg-white rounded-2xl shadow-sm p-4 border-l-4 border-emerald-500 hover:shadow-md transition">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Interns</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{internCount}</p>
            </Link>
            <Link to="/mentor/assignments" className="bg-white rounded-2xl shadow-sm p-4 border-l-4 border-blue-500 hover:shadow-md transition">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Assignments</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{assignments.length}</p>
            </Link>
            <Link to="/mentor/assignments" className="bg-white rounded-2xl shadow-sm p-4 border-l-4 border-amber-500 hover:shadow-md transition">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Reviews</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{pendingReviews}</p>
            </Link>
            <Link to="/mentor/tasks" className="bg-white rounded-2xl shadow-sm p-4 border-l-4 border-gray-400 hover:shadow-md transition">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">To Do</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{todoTasks}</p>
            </Link>
            <Link to="/mentor/tasks" className="bg-white rounded-2xl shadow-sm p-4 border-l-4 border-purple-500 hover:shadow-md transition">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">In Progress</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{inProgressTasks}</p>
            </Link>
            <Link to="/mentor/meetings" className="bg-white rounded-2xl shadow-sm p-4 border-l-4 border-teal-500 hover:shadow-md transition">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Meetings</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{meetings.filter((m) => !m.isPast).length}</p>
            </Link>
          </div>

          {/* Next meeting card */}
          {nextMeeting && (
            <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5">
              <p className="text-xs text-purple-600 font-medium uppercase tracking-wider mb-2">Next Meeting</p>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-gray-800">{nextMeeting.title}</p>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {fmtDateTime(nextMeeting.scheduledAt)}
                    {nextMeeting.duration ? ` · ${nextMeeting.duration} min` : ''}
                  </p>
                </div>
                <a href={nextMeeting.meetingLink} target="_blank" rel="noreferrer" className="shrink-0 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition">
                  Join
                </a>
              </div>
            </div>
          )}

          {/* Cohorts list */}
          {cohorts.length > 0 && (
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
          )}
        </>
      )}
    </div>
  );
}

export default MentorDashboard;