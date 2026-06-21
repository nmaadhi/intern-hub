import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { socket } from '../../lib/socket';

export default function StandupFeed() {
  const [cohorts, setCohorts] = useState([]);
  const [selectedCohortId, setSelectedCohortId] = useState('');
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [feed, setFeed] = useState(null);
  const [loading, setLoading] = useState(false);
  const [newStandup, setNewStandup] = useState(null); // live incoming standup

  useEffect(() => {
    api.get('/mentor/cohorts').then((res) => {
      const list = res.data.cohorts || [];
      setCohorts(list);
      if (list.length > 0) setSelectedCohortId(list[0].id);
    });
  }, []);

  const loadFeed = async () => {
    if (!selectedCohortId) return;
    setLoading(true);
    try {
      const res = await api.get(
        `/standup/feed?cohortId=${selectedCohortId}&date=${selectedDate}`
      );
      setFeed(res.data);
      setNewStandup(null);
    } catch (err) {
      console.error('Failed to load standup feed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedCohortId) loadFeed();
  }, [selectedCohortId, selectedDate]);

  // Socket — live standup updates
  useEffect(() => {
    if (!selectedCohortId) return;
    socket.emit('join:cohort', selectedCohortId);

    const onStandupNew = ({ standup }) => {
      // Only show if it matches selected date
      const standupDate = new Date(standup.date).toISOString().split('T')[0];
      if (standupDate !== selectedDate) return;

      setNewStandup(standup);

      setFeed((prev) => {
        if (!prev) return prev;

        // Update or add standup in feed
        const existingIdx = prev.standups.findIndex(
          (s) => s.internId === standup.internId
        );

        let updatedStandups;
        if (existingIdx >= 0) {
          updatedStandups = [...prev.standups];
          updatedStandups[existingIdx] = standup;
        } else {
          updatedStandups = [...prev.standups, standup];
        }

        // Remove from missing list
        const updatedMissing = prev.missing.filter(
          (m) => m.id !== standup.internId
        );

        return {
          ...prev,
          standups: updatedStandups,
          missing: updatedMissing,
          postedCount: updatedStandups.length,
        };
      });

      // Clear new standup notification after 5 seconds
      setTimeout(() => setNewStandup(null), 5000);
    };

    socket.on('standup:new', onStandupNew);
    return () => socket.off('standup:new', onStandupNew);
  }, [selectedCohortId, selectedDate]);

  const fmtTime = (s) =>
    new Date(s).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Standup Feed</h2>
        <p className="text-sm text-gray-500 mt-1">
          See what your interns are working on every day
        </p>
      </div>

      {/* Live notification */}
      {newStandup && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 flex items-center gap-3 animate-pulse">
          <span className="text-2xl">🔴</span>
          <div>
            <p className="font-medium text-emerald-800">
              Live: {newStandup.intern?.name} just posted their standup!
            </p>
            <p className="text-sm text-emerald-600 mt-0.5">
              Today: {newStandup.today}
            </p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-4 flex-wrap">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Cohort</label>
          <select
            value={selectedCohortId}
            onChange={(e) => setSelectedCohortId(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div className="mt-4">
          <button
            onClick={loadFeed}
            className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition font-medium"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      {feed && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl shadow-sm p-4 text-center border-l-4 border-emerald-500">
            <p className="text-3xl font-bold text-gray-800">{feed.postedCount}</p>
            <p className="text-xs text-gray-500 mt-1">Posted</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4 text-center border-l-4 border-red-400">
            <p className="text-3xl font-bold text-gray-800">{feed.missing.length}</p>
            <p className="text-xs text-gray-500 mt-1">Not posted yet</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm p-4 text-center border-l-4 border-blue-500">
            <p className="text-3xl font-bold text-gray-800">{feed.totalInterns}</p>
            <p className="text-xs text-gray-500 mt-1">Total interns</p>
          </div>
        </div>
      )}

      {/* Missing interns */}
      {feed && feed.missing.length > 0 && isToday && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-sm font-medium text-amber-800 mb-2">
            ⏳ Waiting for standup from:
          </p>
          <div className="flex gap-2 flex-wrap">
            {feed.missing.map((intern) => (
              <span
                key={intern.id}
                className="text-xs bg-amber-100 text-amber-800 px-3 py-1 rounded-full font-medium"
              >
                {intern.name} ({intern.internId})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Standup cards */}
      {loading ? (
        <div className="bg-white rounded-2xl p-8 text-center text-gray-500">
          Loading standups...
        </div>
      ) : !feed || feed.standups.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-500">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-medium">No standups posted yet</p>
          <p className="text-sm text-gray-400 mt-1">
            {isToday
              ? 'Interns will appear here as they post their standups today.'
              : 'No standups were posted on this date.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {feed.standups.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl shadow-sm p-5">
              {/* Intern header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center font-bold text-purple-700 text-sm">
                    {s.intern.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{s.intern.name}</p>
                    <p className="text-xs text-gray-400">{s.intern.internId}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {s.sprint && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                      🏃 {s.sprint.name}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">{fmtTime(s.date)}</span>
                </div>
              </div>

              {/* Standup content */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    🕐 Yesterday
                  </p>
                  <p className="text-sm text-gray-700">{s.yesterday}</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-1">
                    🎯 Today
                  </p>
                  <p className="text-sm text-gray-700">{s.today}</p>
                </div>
                <div className={`rounded-xl p-3 ${s.blockers ? 'bg-red-50' : 'bg-emerald-50'}`}>
                  <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${s.blockers ? 'text-red-500' : 'text-emerald-500'}`}>
                    {s.blockers ? '🚫 Blocker' : '✅ No Blockers'}
                  </p>
                  <p className="text-sm text-gray-700">
                    {s.blockers || 'All clear!'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}