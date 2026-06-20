import { useEffect, useState } from 'react';
import api from '../../lib/api';

const PHASE_COLORS = {
  PLANNING: 'bg-amber-100 text-amber-700 border-amber-200',
  ACTIVE: 'bg-blue-100 text-blue-700 border-blue-200',
  REVIEW: 'bg-purple-100 text-purple-700 border-purple-200',
  COMPLETED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
};

const PHASE_ICONS = {
  PLANNING: '📋',
  ACTIVE: '🏃',
  REVIEW: '🔍',
  COMPLETED: '✅',
};

const STORY_POINTS = [0, 1, 2, 3, 5, 8, 13];

function PhaseBar({ phase }) {
  const phases = ['PLANNING', 'ACTIVE', 'REVIEW', 'COMPLETED'];
  const currentIdx = phases.indexOf(phase);
  return (
    <div className="flex items-center gap-1 mt-2">
      {phases.map((p, i) => (
        <div key={p} className="flex items-center gap-1">
          <div className={`h-1.5 w-8 rounded-full ${i <= currentIdx ? 'bg-purple-500' : 'bg-gray-200'}`} />
          {i < phases.length - 1 && <div className="w-1" />}
        </div>
      ))}
    </div>
  );
}

export default function ManageSprints() {
  const [sprints, setSprints] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [cohortId, setCohortId] = useState('');
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [capacity, setCapacity] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createMessage, setCreateMessage] = useState(null);

  const [filterPhase, setFilterPhase] = useState('all');
  const [filterCohort, setFilterCohort] = useState('all');

  const loadAll = async () => {
    setLoading(true);
    try {
      const [sRes, cRes] = await Promise.all([
        api.get('/sprint/sprints/all'),
        api.get('/admin/cohorts'),
      ]);
      setSprints(sRes.data.sprints || []);
      setCohorts(cRes.data.cohorts || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load sprints');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setCreateMessage(null);
    try {
      await api.post('/sprint/sprints', {
        cohortId, name, goal: goal || undefined,
        startDate, endDate,
        capacity: capacity ? parseInt(capacity) : undefined,
      });
      setCreateMessage({ success: true });
      setName(''); setGoal(''); setStartDate(''); setEndDate('');
      setCohortId(''); setCapacity('');
      setShowForm(false);
      await loadAll();
    } catch (err) {
      setCreateMessage({ success: false, error: err.response?.data?.error || 'Failed to create sprint' });
    } finally {
      setSubmitting(false);
    }
  };

  const fmtDate = (s) => s ? new Date(s).toLocaleDateString([], { dateStyle: 'medium' }) : '';

  const filtered = sprints.filter((s) => {
    if (filterPhase !== 'all' && s.phase !== filterPhase) return false;
    if (filterCohort !== 'all' && s.cohort?.id !== filterCohort) return false;
    return true;
  });

  const stats = {
    total: sprints.length,
    planning: sprints.filter((s) => s.phase === 'PLANNING').length,
    active: sprints.filter((s) => s.phase === 'ACTIVE').length,
    review: sprints.filter((s) => s.phase === 'REVIEW').length,
    completed: sprints.filter((s) => s.phase === 'COMPLETED').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Sprint Management</h2>
          <p className="text-gray-600 text-sm mt-1">Create and monitor sprints across all cohorts</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setCreateMessage(null); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium">
          {showForm ? 'Cancel' : '+ New Sprint'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'border-gray-400' },
          { label: 'Planning', value: stats.planning, color: 'border-amber-400' },
          { label: 'Active', value: stats.active, color: 'border-blue-500' },
          { label: 'Review', value: stats.review, color: 'border-purple-500' },
          { label: 'Completed', value: stats.completed, color: 'border-emerald-500' },
        ].map((s) => (
          <div key={s.label} className={`bg-white rounded-2xl shadow-sm p-4 border-l-4 ${s.color} text-center`}>
            <p className="text-2xl font-bold text-gray-800">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Create a sprint for a cohort</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cohort</label>
                <select value={cohortId} onChange={(e) => setCohortId(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Select a cohort</option>
                  {cohorts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.mentor ? `— mentor: ${c.mentor.name}` : '(no mentor)'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sprint name</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Sprint 1" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start date</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End date</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capacity (story points, optional)</label>
                <input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} min={0} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. 40" />
                <p className="text-xs text-gray-400 mt-1">Total story points the team can handle this sprint</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sprint goal (optional)</label>
                <input type="text" value={goal} onChange={(e) => setGoal(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Complete the authentication module" />
              </div>
            </div>
            <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
              Sprint will be created in <strong>Planning</strong> phase. The cohort's mentor will add cards and story points before starting it.
            </div>
            <button type="submit" disabled={submitting} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium">
              {submitting ? 'Creating...' : 'Create Sprint'}
            </button>
          </form>
        </div>
      )}

      {createMessage?.success && (<div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-800">Sprint created successfully in Planning phase.</div>)}
      {createMessage?.error && (<div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{createMessage.error}</div>)}

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <div className="flex gap-2 flex-wrap">
          {['all', 'PLANNING', 'ACTIVE', 'REVIEW', 'COMPLETED'].map((p) => (
            <button key={p} onClick={() => setFilterPhase(p)} className={`text-xs px-3 py-1.5 rounded-full font-medium transition ${filterPhase === p ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {p === 'all' ? 'All phases' : `${PHASE_ICONS[p]} ${p}`}
            </button>
          ))}
        </div>
        <select value={filterCohort} onChange={(e) => setFilterCohort(e.target.value)} className="text-xs px-3 py-1.5 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="all">All cohorts</option>
          {cohorts.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
        </select>
        {(filterPhase !== 'all' || filterCohort !== 'all') && (
          <button onClick={() => { setFilterPhase('all'); setFilterCohort('all'); }} className="text-xs text-gray-400 hover:text-gray-600 underline">Clear</button>
        )}
      </div>

      {/* Sprint list */}
      {loading ? (
        <p className="text-gray-500 text-center py-8">Loading...</p>
      ) : error ? (
        <p className="text-red-600 text-center py-8">{error}</p>
      ) : filtered.length === 0 ? (
        <p className="text-gray-500 text-center py-8 bg-white rounded-2xl shadow-sm">
          {sprints.length === 0 ? 'No sprints yet. Create one above.' : 'No sprints match the selected filters.'}
        </p>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-gray-800">{s.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${PHASE_COLORS[s.phase]}`}>
                      {PHASE_ICONS[s.phase]} {s.phase}
                    </span>
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {s.cohort?.name}
                    </span>
                    {s.createdBy?.role === 'ADMIN' && (
                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">Created by Admin</span>
                    )}
                  </div>

                  <PhaseBar phase={s.phase} />

                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                    <span>{fmtDate(s.startDate)} → {fmtDate(s.endDate)}</span>
                    <span>{s.taskCount} cards</span>
                    {s.totalPoints > 0 && (<span>{s.completedPoints}/{s.totalPoints} pts</span>)}
                    {s.capacity > 0 && (<span>Capacity: {s.capacity} pts</span>)}
                    {s.phase === 'COMPLETED' && s.velocity > 0 && (
                      <span className="text-emerald-600 font-medium">Velocity: {s.velocity} pts</span>
                    )}
                  </div>

                  {/* Progress bar — only show when active or beyond */}
                  {['ACTIVE', 'REVIEW', 'COMPLETED'].includes(s.phase) && s.totalPoints > 0 && (
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>{s.progressPct}% complete</span>
                        <span>{s.remainingPoints} pts remaining</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${s.phase === 'COMPLETED' ? 'bg-emerald-500' : 'bg-blue-500'}`}
                          style={{ width: `${s.progressPct}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}