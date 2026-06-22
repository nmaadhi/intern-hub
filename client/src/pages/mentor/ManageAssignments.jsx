import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { useFormPersist } from '../../hooks/useFormPersist';

function ManageAssignments() {
  const [assignments, setAssignments] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [interns, setInterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createMessage, setCreateMessage] = useState(null);

  const { values, setValue, resetForm } = useFormPersist('mentor-create-assignment', {
    assignType: 'cohort',
    title: '',
    description: '',
    dueDate: '',
    cohortId: '',
    selectedInternIds: [],
  });

  const activeCohorts = cohorts.filter((c) => c.status === 'ACTIVE');

  const loadAll = async () => {
    setLoading(true);
    try {
      const [aRes, cRes, iRes] = await Promise.all([
        api.get('/mentor/assignments'),
        api.get('/mentor/cohorts'),
        api.get('/mentor/interns'),
      ]);
      setAssignments(aRes.data.assignments || []);
      setCohorts(cRes.data.cohorts || []);
      setInterns(iRes.data.interns || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  const toggleIntern = (id) => {
    const prev = values.selectedInternIds;
    setValue('selectedInternIds',
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setCreateMessage(null);

    if (values.assignType === 'cohort' && !values.cohortId) {
      setCreateMessage({ success: false, error: 'Please select a cohort' });
      setSubmitting(false);
      return;
    }
    if (values.assignType === 'direct' && values.selectedInternIds.length === 0) {
      setCreateMessage({ success: false, error: 'Select at least one intern' });
      setSubmitting(false);
      return;
    }

    try {
      const body = {
        title: values.title,
        description: values.description || undefined,
        dueDate: values.dueDate || undefined,
        ...(values.assignType === 'cohort'
          ? { cohortId: values.cohortId }
          : { internIds: values.selectedInternIds }),
      };
      await api.post('/mentor/assignments', body);
      setCreateMessage({ success: true, type: values.assignType });
      resetForm();
      setShowForm(false);
      await loadAll();
    } catch (err) {
      setCreateMessage({ success: false, error: err.response?.data?.error || 'Failed to create assignment' });
    } finally {
      setSubmitting(false);
    }
  };

  const fmtDate = (s) => s ? new Date(s).toLocaleDateString() : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Assignments</h2>
          <p className="text-gray-600 text-sm mt-1">Assign work to a whole cohort or specific interns</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setCreateMessage(null); }}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition font-medium"
        >
          {showForm ? 'Cancel' : '+ New Assignment'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Create a new assignment</h3>

          <div className="flex gap-2 mb-5">
            <button
              type="button"
              onClick={() => setValue('assignType', 'cohort')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${values.assignType === 'cohort' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Assign to Cohort
            </button>
            <button
              type="button"
              onClick={() => setValue('assignType', 'direct')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${values.assignType === 'direct' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Assign to Specific Interns
            </button>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={values.title}
                onChange={(e) => setValue('title', e.target.value)}
                required
                minLength={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Build a REST API with Express"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
              <textarea
                value={values.description}
                onChange={(e) => setValue('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Explain what needs to be done..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Due date (optional)</label>
              <input
                type="date"
                value={values.dueDate}
                onChange={(e) => setValue('dueDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {values.assignType === 'cohort' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cohort</label>
                {activeCohorts.length === 0 ? (
                  <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">You have no active cohorts.</p>
                ) : (
                  <select
                    value={values.cohortId}
                    onChange={(e) => setValue('cohortId', e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Select a cohort</option>
                    {activeCohorts.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.internCount} interns)</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {values.assignType === 'direct' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select interns <span className="text-gray-400 font-normal">({values.selectedInternIds.length} selected)</span>
                </label>
                {interns.length === 0 ? (
                  <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">No directly assigned interns.</p>
                ) : (
                  <div className="border border-gray-300 rounded-lg divide-y max-h-48 overflow-y-auto">
                    {interns.map((i) => (
                      <label
                        key={i.id}
                        className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-purple-50 transition ${values.selectedInternIds.includes(i.id) ? 'bg-purple-50' : ''}`}
                      >
                        <input
                          type="checkbox"
                          checked={values.selectedInternIds.includes(i.id)}
                          onChange={() => toggleIntern(i.id)}
                          className="accent-purple-600"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-800">{i.name}</p>
                          <p className="text-xs text-gray-500">{i.internId}{i.cohort ? ` - ${i.cohort.name}` : ''}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition font-medium"
            >
              {submitting ? 'Creating...' : 'Create Assignment'}
            </button>
          </form>
        </div>
      )}

      {createMessage?.success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-800">
          {createMessage.type === 'cohort' ? 'Cohort assignment created.' : 'Direct assignment created for selected interns.'}
        </div>
      )}
      {createMessage?.error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{createMessage.error}</div>
      )}

      <div className="space-y-3">
        {loading ? (
          <p className="text-gray-500 text-center py-4">Loading...</p>
        ) : error ? (
          <p className="text-red-600 text-center py-4">{error}</p>
        ) : assignments.length === 0 ? (
          <p className="text-gray-500 text-center py-8 bg-white rounded-2xl shadow-sm">No assignments yet. Create one above.</p>
        ) : (
          assignments.map((a) => {
            const pct = a.totalInterns > 0 ? Math.round((a.submittedCount / a.totalInterns) * 100) : 0;
            return (
              <Link key={a.id} to={`/mentor/assignments/${a.id}`} className="block bg-white rounded-2xl shadow-sm p-5 hover:shadow-md transition">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-gray-800">{a.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.type === 'COHORT' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                        {a.type === 'COHORT' ? 'Cohort' : 'Direct'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {a.type === 'COHORT' ? a.cohort.name : a.recipients.map((r) => r.name).join(', ')}
                      {fmtDate(a.dueDate) ? ` · due ${fmtDate(a.dueDate)}` : ''}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${a.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>
                    {a.status}
                  </span>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{a.submittedCount} of {a.totalInterns} submitted</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="flex gap-3 mt-3 text-xs">
                  <span className="text-emerald-600 font-medium">{a.approvedCount} approved</span>
                  <span className="text-amber-600 font-medium">{a.needsRevisionCount} needs revision</span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}

export default ManageAssignments;