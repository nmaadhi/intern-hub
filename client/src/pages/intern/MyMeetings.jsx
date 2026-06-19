import { useEffect, useState } from 'react';
import api from '../../lib/api';

function MyMeetings() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/intern/meetings');
        setMeetings(res.data.meetings || []);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load meetings');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const fmtDateTime = (s) => s ? new Date(s).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '';

  const upcomingMeetings = meetings.filter((m) => !m.isPast);
  const pastMeetings = meetings.filter((m) => m.isPast);

  if (loading) return <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-500">Loading...</div>;
  if (error) return <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700">{error}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">My Meetings</h2>
        <p className="text-gray-600 text-sm mt-1">Meetings scheduled by your mentor</p>
      </div>

      {meetings.length === 0 ? (
        <p className="text-gray-500 text-center py-8 bg-white rounded-2xl shadow-sm">No meetings scheduled yet.</p>
      ) : (
        <>
          {/* Upcoming */}
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-3">Upcoming ({upcomingMeetings.length})</h3>
            {upcomingMeetings.length === 0 ? (
              <p className="text-sm text-gray-500 bg-white rounded-2xl shadow-sm p-6 text-center">No upcoming meetings.</p>
            ) : (
              <div className="space-y-3">
                {upcomingMeetings.map((m) => (
                  <div key={m.id} className="bg-white rounded-2xl shadow-sm p-5 border-l-4 border-purple-400">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-gray-800">{m.title}</h4>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.type === 'COHORT' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                            {m.type === 'COHORT' ? 'Cohort' : 'Direct'}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {fmtDateTime(m.scheduledAt)}
                          {m.duration ? ` · ${m.duration} min` : ''}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">Scheduled by {m.mentor?.name}</p>
                        {m.description && (<p className="text-sm text-gray-600 mt-1">{m.description}</p>)}
                      </div>
                      <a href={m.meetingLink} target="_blank" rel="noreferrer" className="shrink-0 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition">
                        Join
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Past */}
          {pastMeetings.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-500 mb-3">Past ({pastMeetings.length})</h3>
              <div className="space-y-2">
                {pastMeetings.map((m) => (
                  <div key={m.id} className="bg-gray-50 rounded-2xl p-4 opacity-60">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-gray-600">{m.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{fmtDateTime(m.scheduledAt)}{m.duration ? ` · ${m.duration} min` : ''}</p>
                      </div>
                      <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">Past</span>
                    </div>
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

export default MyMeetings;