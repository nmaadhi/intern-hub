import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { socket } from '../../lib/socket';

function ResultBar({ option, totalResponses }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-700">{option.text}</span>
        <span className="text-gray-500 font-medium">{option.count} ({option.pct}%)</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-6 overflow-hidden">
        <div
          className="h-6 bg-purple-500 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
          style={{ width: `${option.pct}%` }}
        >
          {option.pct > 10 && (
            <span className="text-white text-xs font-bold">{option.pct}%</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Polls() {
  const [cohorts, setCohorts] = useState([]);
  const [selectedCohortId, setSelectedCohortId] = useState('');
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(false);

  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    api.get('/mentor/cohorts').then((res) => {
      const list = res.data.cohorts || [];
      setCohorts(list);
      if (list.length > 0) setSelectedCohortId(list[0].id);
    });
  }, []);

  const loadPolls = async () => {
    if (!selectedCohortId) return;
    setLoading(true);
    try {
      const res = await api.get(`/poll?cohortId=${selectedCohortId}`);
      setPolls(res.data.polls || []);
    } catch (err) {
      console.error('Failed to load polls');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadPolls(); }, [selectedCohortId]);

  // Socket — live result updates
  useEffect(() => {
    if (!selectedCohortId) return;
    socket.emit('join:cohort', selectedCohortId);

    const onPollUpdated = ({ poll }) => {
      setPolls((prev) => prev.map((p) => p.id === poll.id ? poll : p));
    };

    socket.on('poll:updated', onPollUpdated);
    return () => socket.off('poll:updated', onPollUpdated);
  }, [selectedCohortId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    const filledOptions = options.filter((o) => o.trim());
    if (filledOptions.length < 2) return alert('Add at least 2 options');
    setCreating(true);
    try {
      const res = await api.post('/poll', {
        cohortId: selectedCohortId,
        question,
        options: filledOptions,
      });
      setPolls((prev) => [res.data.poll, ...prev]);
      setQuestion(''); setOptions(['', '']); setShowForm(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create poll');
    } finally {
      setCreating(false);
    }
  };

  const handleLaunch = async (pollId) => {
    try {
      const res = await api.patch(`/poll/${pollId}/launch`);
      setPolls((prev) => prev.map((p) => p.id === pollId ? res.data.poll : p));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to launch poll');
    }
  };

  const handleClose = async (pollId) => {
    try {
      await api.patch(`/poll/${pollId}/close`);
      setPolls((prev) => prev.map((p) => p.id === pollId ? { ...p, status: 'CLOSED' } : p));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to close poll');
    }
  };

  const handleDelete = async (pollId) => {
    if (!window.confirm('Delete this poll?')) return;
    try {
      await api.delete(`/poll/${pollId}`);
      setPolls((prev) => prev.filter((p) => p.id !== pollId));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete poll');
    }
  };

  const addOption = () => {
    if (options.length < 6) setOptions([...options, '']);
  };

  const updateOption = (i, val) => {
    const updated = [...options];
    updated[i] = val;
    setOptions(updated);
  };

  const removeOption = (i) => {
    if (options.length <= 2) return;
    setOptions(options.filter((_, idx) => idx !== i));
  };

  const STATUS_COLORS = {
    DRAFT: 'bg-gray-100 text-gray-600',
    ACTIVE: 'bg-emerald-100 text-emerald-700',
    CLOSED: 'bg-red-100 text-red-600',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Live Polls</h2>
          <p className="text-sm text-gray-500 mt-1">Launch polls to get instant feedback from interns</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedCohortId}
            onChange={(e) => setSelectedCohortId(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {cohorts.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition text-sm font-medium"
          >
            {showForm ? 'Cancel' : '+ New Poll'}
          </button>
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="font-bold text-gray-800 mb-4">Create a poll</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Which React concept is still unclear?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Options (2-6)</label>
              <div className="space-y-2">
                {options.map((opt, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => updateOption(i, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder={`Option ${i + 1}`}
                    />
                    {options.length > 2 && (
                      <button type="button" onClick={() => removeOption(i)} className="text-red-400 hover:text-red-600 px-2">✕</button>
                    )}
                  </div>
                ))}
              </div>
              {options.length < 6 && (
                <button type="button" onClick={addOption} className="mt-2 text-sm text-purple-600 hover:underline">
                  + Add option
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={creating} className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition text-sm font-medium">
                {creating ? 'Creating...' : 'Create Poll'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Polls list */}
      {loading ? (
        <div className="bg-white rounded-2xl p-8 text-center text-gray-500">Loading...</div>
      ) : polls.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-500">
          <p className="text-4xl mb-3">📊</p>
          <p className="font-medium">No polls yet</p>
          <p className="text-sm text-gray-400 mt-1">Create a poll above and launch it to get instant intern feedback</p>
        </div>
      ) : (
        <div className="space-y-4">
          {polls.map((poll) => (
            <div key={poll.id} className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[poll.status]}`}>
                      {poll.status === 'ACTIVE' ? '🟢 LIVE' : poll.status === 'DRAFT' ? '📝 DRAFT' : '🔴 CLOSED'}
                    </span>
                    <span className="text-xs text-gray-400">{poll.totalResponses} response{poll.totalResponses !== 1 ? 's' : ''}</span>
                  </div>
                  <h3 className="font-bold text-gray-800">{poll.question}</h3>
                </div>
                <div className="flex gap-2 shrink-0">
                  {poll.status === 'DRAFT' && (
                    <button onClick={() => handleLaunch(poll.id)} className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition font-medium">
                      🚀 Launch
                    </button>
                  )}
                  {poll.status === 'ACTIVE' && (
                    <button onClick={() => handleClose(poll.id)} className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 transition font-medium">
                      Stop
                    </button>
                  )}
                  {poll.status !== 'ACTIVE' && (
                    <button onClick={() => handleDelete(poll.id)} className="text-xs text-gray-400 hover:text-red-500 px-2 py-1.5 transition">
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {/* Results */}
              <div className="space-y-3">
                {poll.options.map((opt) => (
                  <ResultBar key={opt.id} option={opt} totalResponses={poll.totalResponses} />
                ))}
              </div>

              {poll.status === 'ACTIVE' && (
                <p className="text-xs text-emerald-600 mt-3 font-medium animate-pulse">
                  🟢 Live — results update in real time as interns answer
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}