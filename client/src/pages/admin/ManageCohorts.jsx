import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { useFormPersist } from '../../hooks/useFormPersist';

function ManageCohorts() {
  const [cohorts, setCohorts] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createMessage, setCreateMessage] = useState(null);
  const [pickerFor, setPickerFor] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const { values, setValue, resetForm } = useFormPersist('admin-create-cohort', {
    name: '', description: '', startDate: '', endDate: '', mentorId: '',
  });

  const loadAll = async () => {
    setLoading(true);
    try {
      const [c, m] = await Promise.all([
        api.get('/admin/cohorts'),
        api.get('/admin/mentors'),
      ]);
      setCohorts(c.data.cohorts || []);
      setMentors(m.data.mentors || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load data');
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
      const body = {
        name: values.name,
        description: values.description || undefined,
        startDate: values.startDate,
      };
      if (values.endDate) body.endDate = values.endDate;
      if (values.mentorId) body.mentorId = values.mentorId;
      const res = await api.post('/admin/cohorts', body);
      setCreateMessage({ success: true, name: res.data.cohort.name });
      resetForm();
      await loadAll();
    } catch (err) {
      setCreateMessage({ success: false, error: err.response?.data?.error || 'Failed' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignMentor = async (cohortId, newMentorId) => {
    try {
      await api.patch(`/admin/cohorts/${cohortId}`, { mentorId: newMentorId });
      setPickerFor(null);
      await loadAll();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to assign mentor');
    }
  };

  const handleStatusChange = async (cohortId, status) => {
    try {
      await api.patch(`/admin/cohorts/${cohortId}`, { status });
      await loadAll();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status');
    }
  };

  const handleDelete = async (cohort) => {
    if (!window.confirm(
      `Delete cohort "${cohort.name}"? This will permanently remove the cohort and all its sprints, assignments, polls, announcements and notes. Interns will be unassigned. This cannot be undone.`
    )) return;
    setActionLoadingId(cohort.id);
    try {
      await api.delete(`/admin/cohorts/${cohort.id}`);
      setCohorts((prev) => prev.filter((c) => c.id !== cohort.id));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete cohort');
    } finally {
      setActionLoadingId(null);
    }
  };

  const fmtDate = (s) => s ? new Date(s).toLocaleDateString() : '';

  // Cohorts with no mentor assigned
  const cohortsWithoutMentor = cohorts.filter((c) => !c.mentor && c.status === 'ACTIVE');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Manage Cohorts</h2>
          <p className="text-gray-600 text-sm mt-1">Create cohorts and assign one mentor to each</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setCreateMessage(null); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
        >
          {showForm ? 'Cancel' : '+ New Cohort'}
        </button>
      </div>

      {/* ── Alert: cohorts without mentor ── */}
      {cohortsWithoutMentor.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="font-bold text-amber-800">Action Required — Cohorts Without a Mentor</h3>
              <p className="text-sm text-amber-700 mt-1">
                The following active cohorts have no mentor assigned. Interns in these cohorts won't have a mentor to guide them.
              </p>
              <div className="mt-3 space-y-2">
                {cohortsWithoutMentor.map((c) => (
                  <div key={c.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-2 border border-amber-200">
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{c.name}</p>
                      <p className="text-xs text-gray-500">{c.internCount} intern{c.internCount !== 1 ? 's' : ''}</p>
                    </div>
                    <button
                      onClick={() => setPickerFor(c.id)}
                      className="text-xs bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 transition font-medium"
                    >
                      + Assign Mentor
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Create a new cohort</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                type="text" value={values.name}
                onChange={(e) => setValue('name', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Summer Intern Batch 2026"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
              <input
                type="text" value={values.description}
                onChange={(e) => setValue('description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="10-week summer program"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start date</label>
                <input
                  type="date" value={values.startDate}
                  onChange={(e) => setValue('startDate', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End date (optional)</label>
                <input
                  type="date" value={values.endDate}
                  onChange={(e) => setValue('endDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mentor (optional)</label>
              <select
                value={values.mentorId}
                onChange={(e) => setValue('mentorId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No mentor yet</option>
                {mentors.filter((m) => m.status === 'ACTIVE').map((m) => (
                  <option key={m.id} value={m.id}>{m.name} ({m.email})</option>
                ))}
              </select>
            </div>
            <button
              type="submit" disabled={submitting}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium"
            >
              {submitting ? 'Creating...' : 'Create Cohort'}
            </button>
          </form>
        </div>
      )}

      {createMessage?.success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-800">
          ✅ Created cohort: {createMessage.name}
        </div>
      )}
      {createMessage?.error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {createMessage.error}
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          <p className="text-gray-500 text-center py-4">Loading...</p>
        ) : error ? (
          <p className="text-red-600 text-center py-4">{error}</p>
        ) : cohorts.length === 0 ? (
          <p className="text-gray-500 text-center py-8 bg-white rounded-2xl shadow-sm">No cohorts yet.</p>
        ) : (
          cohorts.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-start justify-between mb-3 flex-wrap gap-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{c.name}</h3>
                  {c.description && <p className="text-sm text-gray-600 mt-0.5">{c.description}</p>}
                  <p className="text-xs text-gray-500 mt-1">
                    {fmtDate(c.startDate)} {c.endDate ? `→ ${fmtDate(c.endDate)}` : '(open-ended)'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={c.status}
                    onChange={(e) => handleStatusChange(c.id, e.target.value)}
                    className={`text-xs px-2 py-1 rounded-full font-medium border-0 cursor-pointer ${
                      c.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
                      c.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' :
                      'bg-gray-200 text-gray-600'
                    }`}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                  <button
                    onClick={() => handleDelete(c)}
                    disabled={actionLoadingId === c.id}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium bg-red-100 text-red-600 hover:bg-red-200 transition disabled:opacity-50"
                  >
                    {actionLoadingId === c.id ? '...' : '🗑 Delete'}
                  </button>
                </div>
              </div>

              {/* No mentor warning on individual cohort */}
              {!c.mentor && c.status === 'ACTIVE' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 flex items-center gap-2">
                  <span>⚠️</span>
                  <p className="text-xs text-amber-700 font-medium">No mentor assigned — interns in this cohort have no mentor.</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                <div className="bg-gray-50 rounded p-2">
                  <span className="text-gray-500">Mentor:</span>{' '}
                  {c.mentor ? (
                    <strong className="text-gray-800">{c.mentor.name}</strong>
                  ) : (
                    <span className="text-red-500 italic font-medium">⚠️ Unassigned</span>
                  )}
                </div>
                <div className="bg-gray-50 rounded p-2">
                  <span className="text-gray-500">Interns:</span>{' '}
                  <strong className="text-gray-800">{c.internCount}</strong>
                </div>
              </div>

              {pickerFor === c.id ? (
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-sm font-medium text-blue-800 mb-2">Pick a mentor for this cohort:</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {c.mentor && (
                      <button
                        onClick={() => handleAssignMentor(c.id, null)}
                        className="w-full text-left text-sm px-3 py-2 rounded bg-white hover:bg-red-50 text-red-600"
                      >
                        Remove current mentor ({c.mentor.name})
                      </button>
                    )}
                    {mentors.filter((m) => m.status === 'ACTIVE').length === 0 ? (
                      <p className="text-sm text-gray-500 p-2">No active mentors. Create one first.</p>
                    ) : (
                      mentors.filter((m) => m.status === 'ACTIVE').map((m) => {
                        const isCurrent = c.mentor?.id === m.id;
                        return (
                          <button
                            key={m.id}
                            onClick={() => handleAssignMentor(c.id, m.id)}
                            disabled={isCurrent}
                            className={`w-full text-left text-sm px-3 py-2 rounded ${
                              isCurrent ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white hover:bg-blue-100 text-gray-800'
                            }`}
                          >
                            {m.name} <span className="text-xs text-gray-500">({m.email})</span>
                            {isCurrent && <span className="text-xs text-emerald-600 ml-2">current</span>}
                          </button>
                        );
                      })
                    )}
                  </div>
                  <button
                    onClick={() => setPickerFor(null)}
                    className="mt-2 text-xs text-gray-500 hover:text-gray-700 underline"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setPickerFor(c.id)}
                  className={`text-sm font-medium ${c.mentor ? 'text-blue-600 hover:text-blue-800' : 'text-amber-600 hover:text-amber-800'}`}
                >
                  {c.mentor ? 'Change mentor' : '+ Assign mentor'}
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ManageCohorts;