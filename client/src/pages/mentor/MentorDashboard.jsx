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
          interns: iRes.data.interns || [],
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

  const { cohorts, interns, internCount, assignments, tasks, meetings } = data;

  const pendingReviews = assignments.reduce(
    (sum, a) => sum + (a.submittedCount - a.approvedCount - a.needsRevisionCount), 0
  );
  const todoTasks = tasks.filter((t) => t.status === 'TODO').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const nextMeeting = meetings.find((m) => !m.isPast);

  const fmtDateTime = (s) => s ? new Date(s).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '';
  const fmtDate = (s) => s ? new Date(s).toLocaleDateString([], { dateStyle: 'medium' }) : '';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Welcome, {user?.name} 👋</h2>
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
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Pending Reviews</p>
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
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Upcoming</p>
              <p className="text-3xl font-bold text-gray-800 mt-1">{meetings.filter((m) => !m.isPast).length}</p>
            </Link>
          </div>

          {/* Next meeting */}
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
                <a href={nextMeeting.meetingLink} target="_blank" rel="noreferrer"
                  className="shrink-0 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 transition">
                  Join
                </a>
              </div>
            </div>
          )}

          {/* ── Cohort Cards with intern list ── */}
          {cohorts.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-800">My Cohorts</h3>
              {cohorts.map((cohort) => {
                const cohortInterns = interns.filter((i) => i.cohort?.id === cohort.id);
                const otherInterns = interns.filter((i) => !i.cohort?.id);

                return (
                  <div key={cohort.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    {/* Cohort header */}
                    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                          <h4 className="text-lg font-bold text-white">{cohort.name}</h4>
                          {cohort.description && (
                            <p className="text-purple-200 text-sm mt-0.5">{cohort.description}</p>
                          )}
                        </div>
                        <span className={`text-xs px-3 py-1 rounded-full font-bold ${
                          cohort.status === 'ACTIVE'
                            ? 'bg-emerald-400 text-white'
                            : 'bg-gray-300 text-gray-700'
                        }`}>
                          {cohort.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-purple-200 text-xs">
                        <span>📅 {fmtDate(cohort.startDate)} → {cohort.endDate ? fmtDate(cohort.endDate) : 'Ongoing'}</span>
                        <span>👥 {cohort.internCount} intern{cohort.internCount !== 1 ? 's' : ''}</span>
                      </div>
                    </div>

                    {/* Intern list */}
                    <div className="p-5">
                      {cohortInterns.length === 0 ? (
                        <p className="text-sm text-gray-400 italic text-center py-3">
                          No interns assigned to this cohort yet
                        </p>
                      ) : (
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                            Interns in this cohort
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {cohortInterns.map((intern) => (
                              <div key={intern.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                {/* Avatar */}
                                <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center font-bold text-purple-700 text-sm shrink-0">
                                  {intern.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-gray-800 truncate">{intern.name}</p>
                                  <p className="text-xs text-gray-500 truncate">{intern.internId} · {intern.email}</p>
                                </div>
                                <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ml-auto ${
                                  intern.status === 'ACTIVE'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-gray-200 text-gray-500'
                                }`}>
                                  {intern.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Direct interns (not in any cohort) */}
          {(() => {
            const directInterns = interns.filter((i) => !i.cohort?.id);
            if (directInterns.length === 0) return null;
            return (
              <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4">
                  <h4 className="text-lg font-bold text-white">Direct Interns</h4>
                  <p className="text-emerald-100 text-sm mt-0.5">Assigned to you directly (not in a cohort)</p>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {directInterns.map((intern) => (
                      <div key={intern.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center font-bold text-emerald-700 text-sm shrink-0">
                          {intern.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{intern.name}</p>
                          <p className="text-xs text-gray-500 truncate">{intern.internId} · {intern.email}</p>
                        </div>
                        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ml-auto ${
                          intern.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-200 text-gray-500'
                        }`}>
                          {intern.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Quick actions */}
          <div className="bg-white rounded-2xl shadow-sm p-5">
            <h3 className="font-bold text-gray-800 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { to: '/mentor/sprint', icon: '🏃', label: 'Sprint Board', color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
                { to: '/mentor/standup', icon: '📋', label: 'Standup Feed', color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
                { to: '/mentor/quiz', icon: '🧠', label: 'Generate Quiz', color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
                { to: '/mentor/chat', icon: '💬', label: 'Chat', color: 'bg-amber-50 text-amber-700 hover:bg-amber-100' },
              ].map((action) => (
                <Link
                  key={action.to}
                  to={action.to}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl transition font-medium text-sm ${action.color}`}
                >
                  <span className="text-2xl">{action.icon}</span>
                  <span>{action.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default MentorDashboard;