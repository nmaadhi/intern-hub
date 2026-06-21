import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { socket } from '../../lib/socket';

export default function ActivePoll() {
  const [poll, setPoll] = useState(null);
  const [myAnswerId, setMyAnswerId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [cohortId, setCohortId] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadActivePoll = async () => {
    try {
      const res = await api.get('/poll/active');
      setPoll(res.data.poll);
      setMyAnswerId(res.data.myAnswerId);
    } catch (err) {
      console.error('Failed to load active poll');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivePoll();
    api.get('/intern/me').then((res) => {
      setCohortId(res.data.profile?.cohort?.id);
    });
  }, []);

  // Socket — live poll events
  useEffect(() => {
    if (!cohortId) return;
    socket.emit('join:cohort', cohortId);

    const onPollLaunched = ({ poll }) => {
      setPoll(poll);
      setMyAnswerId(null);
    };

    const onPollUpdated = ({ poll }) => {
      setPoll(poll);
    };

    const onPollClosed = ({ pollId }) => {
      setPoll((prev) =>
        prev?.id === pollId ? { ...prev, status: 'CLOSED' } : prev
      );
    };

    socket.on('poll:launched', onPollLaunched);
    socket.on('poll:updated', onPollUpdated);
    socket.on('poll:closed', onPollClosed);

    return () => {
      socket.off('poll:launched', onPollLaunched);
      socket.off('poll:updated', onPollUpdated);
      socket.off('poll:closed', onPollClosed);
    };
  }, [cohortId]);

  const handleAnswer = async (optionId) => {
    if (submitting || poll?.status !== 'ACTIVE') return;
    setSubmitting(true);
    try {
      const res = await api.post(`/poll/${poll.id}/respond`, { optionId });
      setPoll(res.data.poll);
      setMyAnswerId(res.data.myAnswerId);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit answer');
    } finally {
      setSubmitting(false);
    }
  };

  const isActive = poll?.status === 'ACTIVE';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Live Polls</h2>
        <p className="text-sm text-gray-500 mt-1">
          Answer polls launched by your mentor — results update live
        </p>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-500">
          Loading...
        </div>
      ) : !poll ? (
        // No active poll
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
          <div className="text-5xl mb-4">📊</div>
          <h3 className="font-bold text-gray-700 text-lg">No active poll right now</h3>
          <p className="text-sm text-gray-400 mt-2 max-w-sm mx-auto">
            When your mentor launches a poll, it will appear here instantly.
            You'll also get a notification bell alert.
          </p>
          <div className="mt-6 bg-gray-50 rounded-xl p-4 text-left max-w-sm mx-auto">
            <p className="text-xs font-medium text-gray-500 mb-2">How it works:</p>
            <ul className="space-y-1 text-xs text-gray-500">
              <li>→ Mentor creates and launches a poll</li>
              <li>→ It appears on this page <strong>instantly</strong></li>
              <li>→ You click your answer</li>
              <li>→ Results update live for everyone</li>
              <li>→ You can change your answer while poll is open</li>
            </ul>
          </div>
        </div>
      ) : (
        // Active or closed poll
        <div className={`rounded-2xl shadow-sm p-6 border-2 ${isActive ? 'border-purple-300 bg-purple-50' : 'bg-white border-gray-200'}`}>
          <div className="flex items-center gap-2 mb-4">
            {isActive ? (
              <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full font-medium animate-pulse">
                🟢 LIVE POLL
              </span>
            ) : (
              <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                🔴 Poll Closed
              </span>
            )}
            <span className="text-xs text-gray-500">
              {poll.totalResponses} response{poll.totalResponses !== 1 ? 's' : ''}
            </span>
          </div>

          <h3 className="font-bold text-gray-800 text-lg mb-5">{poll.question}</h3>

          <div className="space-y-3">
            {poll.options.map((opt) => {
              const isMyAnswer = myAnswerId === opt.id;
              const showResults = !!myAnswerId || !isActive;

              return (
                <div key={opt.id}>
                  {!showResults ? (
                    <button
                      onClick={() => handleAnswer(opt.id)}
                      disabled={submitting}
                      className={`w-full text-left px-4 py-3 rounded-xl border-2 transition font-medium text-sm
                        border-gray-200 bg-white text-gray-700
                        ${!submitting ? 'hover:border-purple-400 hover:bg-purple-50 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
                    >
                      {opt.text}
                    </button>
                  ) : (
                    <div className={`rounded-xl border-2 p-3 ${isMyAnswer ? 'border-purple-400 bg-purple-50' : 'border-gray-100 bg-gray-50'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-sm font-medium ${isMyAnswer ? 'text-purple-700' : 'text-gray-700'}`}>
                          {isMyAnswer && '✅ '}{opt.text}
                        </span>
                        <span className="text-xs text-gray-500 font-medium">
                          {opt.count} ({opt.pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all duration-500 ${isMyAnswer ? 'bg-purple-500' : 'bg-gray-400'}`}
                          style={{ width: `${opt.pct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {myAnswerId && isActive && (
            <p className="text-xs text-purple-600 mt-4 font-medium">
              ✅ Answer recorded — you can change it anytime while the poll is live
            </p>
          )}
          {!myAnswerId && isActive && (
            <p className="text-xs text-gray-500 mt-4">
              👆 Tap an option to submit your answer
            </p>
          )}
          {!isActive && (
            <p className="text-xs text-gray-400 mt-4">
              This poll has been closed by your mentor.
            </p>
          )}
        </div>
      )}
    </div>
  );
}