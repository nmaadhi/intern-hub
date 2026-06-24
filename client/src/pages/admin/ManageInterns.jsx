import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { useFormPersist } from '../../hooks/useFormPersist';

function ManageInterns() {
  const [interns, setInterns] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createResult, setCreateResult] = useState(null);
  const [cohortPickerFor, setCohortPickerFor] = useState(null);
  const [mentorPickerFor, setMentorPickerFor] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const { values, setValue, resetForm } = useFormPersist('admin-create-intern', {
    name: '', email: '', phone: '', dob: '', college: '', cohortId: '', mentorId: '',
  });

  const activeCohorts = cohorts.filter((c) => c.status === 'ACTIVE');
  const activeMentors = mentors.filter((m) => m.status === 'ACTIVE');

  const loadAll = async () => {
    setLoading(true);
    try {
      const [i, c, m] = await Promise.all([
        api.get('/admin/interns'),
        api.get('/admin/cohorts'),
        api.get('/admin/mentors'),
      ]);
      setInterns(i.data.interns || []);
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
    setCreateResult(null);
    try {
      const res = await api.post('/admin/interns', {
        name: values.name,
        email: values.email,
        phone: values.phone || undefined,
        dob: values.dob || undefined,
        college: values.college || undefined,
        cohortId: values.cohortId || undefined,
        mentorId: values.mentorId || undefined,
      });
      setCreateResult({ success: true, ...res.data });
      resetForm();
      await loadAll();
    } catch (err) {
      setCreateResult({ success: false, error: err.response?.data?.error || 'Failed to create intern' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (intern) => {
    const newStatus = intern.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const msg = newStatus === 'INACTIVE'
      ? `Deactivate ${intern.name}? They will not be able to login.`
      : `Activate ${intern.name}? They will be able to login again.`;
    if (!window.confirm(msg)) return;
    setActionLoadingId(intern.id);
    try {
      await api.patch(`/admin/interns/${intern.id}/status`, { status: newStatus });
      await loadAll();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (intern) => {
    if (!window.confirm(`Permanently delete ${intern.name} (${intern.internId})? This cannot be undone.`)) return;
    setActionLoadingId(intern.id);
    try {
      await api.delete(`/admin/interns/${intern.id}`);
      setInterns((prev) => prev.filter((i) => i.id !== intern.id));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete intern');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAssignCohort = async (internId, newCohortId) => {
    try {
      await api.patch(`/admin/interns/${internId}/cohort`, { cohortId: newCohortId });
      setCohortPickerFor(null);
      await loadAll();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update cohort');
    }
  };

  const handleAssignMentor = async (internId, newMentorId) => {
    try {
      await api.patch(`/admin/interns/${internId}/mentor`, { mentorId: newMentorId });
      setMentorPickerFor(null);
      await loadAll();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update mentor');
    }
  };

  const copyToClipboard = (text) => { navigator.clipboard.writeText(text); };
  const fmtDate = (s) => s ? new Date(s).toLocaleDateString() : '';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Manage Interns</h2>
          <p className="text-gray-600 text-sm mt-1">Create intern accounts and manage access</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setCreateResult(null); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
        >
          {showForm ? 'Cancel' : '+ New Intern'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Add a new intern</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
                <input type="text" value={values.name} onChange={(e) => setValue('name', e.target.value)}
                  required minLength={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Karthik Raman" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                <input type="email" value={values.email} onChange={(e) => setValue('email', e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="karthik@example.com" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
                <input type="tel" value={values.phone} onChange={(e) => setValue('phone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="9876543210" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of birth (optional)</label>
                <input type="date" value={values.dob} onChange={(e) => setValue('dob', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">College (optional)</label>
              <input type="text" value={values.college} onChange={(e) => setValue('college', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="SSN College of Engineering" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mentor (optional)</label>
                <select value={values.mentorId} onChange={(e) => setValue('mentorId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">No mentor yet</option>
                  {activeMentors.map((m) => (<option key={m.id} value={m.id}>{m.name} ({m.email})</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cohort (optional)</label>
                <select value={values.cohortId} onChange={(e) => setValue('cohortId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">No cohort yet</option>
                  {activeCohorts.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
              </div>
            </div>
            <button type="submit" disabled={submitting}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium">
              {submitting ? 'Creating...' : 'Create Intern'}
            </button>
          </form>
        </div>
      )}

      {createResult?.success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p className="font-medium text-emerald-800">
            Created: {createResult.intern.name} ({createResult.intern.internId})
          </p>
          {createResult.emailSent ? (
            <p className="text-sm text-emerald-700 mt-1">Welcome email sent to {createResult.intern.email}</p>
          ) : (
            <>
              <div className="mt-2 flex items-center gap-2 text-sm">
                <span className="text-emerald-700">Temp password:</span>
                <code className="bg-white px-2 py-0.5 rounded border border-emerald-200 font-mono text-emerald-900">
                  {createResult.tempPassword}
                </code>
                <button onClick={() => copyToClipboard(createResult.tempPassword)}
                  className="text-xs text-emerald-600 underline">Copy</button>
              </div>
              <p className="text-xs text-amber-600 mt-2">Email failed — share this password manually.</p>
            </>
          )}
        </div>
      )}

      {createResult?.error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {createResult.error}
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">All Interns ({interns.length})</h3>
        {loading ? (
          <p className="text-gray-500 text-center py-4">Loading...</p>
        ) : error ? (
          <p className="text-red-600 text-center py-4">{error}</p>
        ) : interns.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No interns yet.</p>
        ) : (
          <div className="space-y-3">
            {interns.map((i) => (
              <div key={i.id} className={`p-4 rounded-xl border ${
                i.status === 'INACTIVE' ? 'bg-gray-50 border-gray-200 opacity-75' : 'bg-white border-gray-200'
              }`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-gray-800">{i.name}</p>
                      <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full font-mono">{i.internId}</span>
                      {i.mustChangePassword && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Pending login</span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        i.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                      }`}>
                        {i.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{i.email}{i.phone ? ` · ${i.phone}` : ''}</p>
                    {i.college && <p className="text-xs text-gray-400 mt-0.5">{i.college}{i.dob ? ` · Born ${fmtDate(i.dob)}` : ''}</p>}
                    <p className="text-xs text-gray-500 mt-1">
                      Mentor: {i.mentor ? <strong>{i.mentor.name}</strong> : <span className="italic text-gray-400">none</span>}
                      {' · '}
                      Cohort: {i.cohort ? <strong>{i.cohort.name}</strong> : <span className="italic text-gray-400">none</span>}
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleStatus(i)}
                      disabled={actionLoadingId === i.id}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition disabled:opacity-50 ${
                        i.status === 'ACTIVE'
                          ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                          : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                      }`}
                    >
                      {actionLoadingId === i.id ? '...' : i.status === 'ACTIVE' ? '🔒 Deactivate' : '✅ Activate'}
                    </button>
                    <button
                      onClick={() => handleDelete(i)}
                      disabled={actionLoadingId === i.id}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium bg-red-100 text-red-600 hover:bg-red-200 transition disabled:opacity-50"
                    >
                      🗑 Delete
                    </button>
                  </div>
                </div>

                {i.status === 'INACTIVE' && (
                  <p className="text-xs text-red-500 mt-2">⚠️ This intern is deactivated and cannot login.</p>
                )}

                {/* Mentor picker */}
                {mentorPickerFor === i.id ? (
                  <div className="bg-purple-50 rounded-lg p-3 mt-3">
                    <p className="text-sm font-medium text-purple-800 mb-2">Pick a mentor for {i.name}:</p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {i.mentor && (
                        <button onClick={() => handleAssignMentor(i.id, null)}
                          className="w-full text-left text-sm px-3 py-2 rounded bg-white hover:bg-red-50 text-red-600">
                          Remove current mentor ({i.mentor.name})
                        </button>
                      )}
                      {activeMentors.map((m) => {
                        const isCurrent = i.mentor?.id === m.id;
                        return (
                          <button key={m.id} onClick={() => handleAssignMentor(i.id, m.id)} disabled={isCurrent}
                            className={`w-full text-left text-sm px-3 py-2 rounded ${isCurrent ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white hover:bg-purple-100 text-gray-800'}`}>
                            {m.name} {isCurrent && <span className="text-xs text-emerald-600 ml-2">current</span>}
                          </button>
                        );
                      })}
                    </div>
                    <button onClick={() => setMentorPickerFor(null)} className="mt-2 text-xs text-gray-500 underline">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setMentorPickerFor(i.id)}
                    className="text-xs text-purple-600 hover:text-purple-800 font-medium mt-2 mr-4">
                    {i.mentor ? 'Change mentor' : '+ Assign mentor'}
                  </button>
                )}

                {/* Cohort picker */}
                {cohortPickerFor === i.id ? (
                  <div className="bg-blue-50 rounded-lg p-3 mt-3">
                    <p className="text-sm font-medium text-blue-800 mb-2">Pick a cohort for {i.name}:</p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {i.cohort && (
                        <button onClick={() => handleAssignCohort(i.id, null)}
                          className="w-full text-left text-sm px-3 py-2 rounded bg-white hover:bg-red-50 text-red-600">
                          Remove from current cohort ({i.cohort.name})
                        </button>
                      )}
                      {activeCohorts.map((c) => {
                        const isCurrent = i.cohort?.id === c.id;
                        return (
                          <button key={c.id} onClick={() => handleAssignCohort(i.id, c.id)} disabled={isCurrent}
                            className={`w-full text-left text-sm px-3 py-2 rounded ${isCurrent ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white hover:bg-blue-100 text-gray-800'}`}>
                            {c.name} {isCurrent && <span className="text-xs text-emerald-600 ml-2">current</span>}
                          </button>
                        );
                      })}
                    </div>
                    <button onClick={() => setCohortPickerFor(null)} className="mt-2 text-xs text-gray-500 underline">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setCohortPickerFor(i.id)}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium mt-2">
                    {i.cohort ? 'Change cohort' : '+ Assign cohort'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ManageInterns;