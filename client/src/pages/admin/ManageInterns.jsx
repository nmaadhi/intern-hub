import { useEffect, useState } from 'react';
import api from '../../lib/api';

function ManageInterns() {
  const [interns, setInterns] = useState([]);
  const [cohorts, setCohorts] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dob, setDob] = useState('');
  const [college, setCollege] = useState('');
  const [cohortId, setCohortId] = useState('');
  const [mentorId, setMentorId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createResult, setCreateResult] = useState(null);

  const [cohortPickerFor, setCohortPickerFor] = useState(null);
  const [mentorPickerFor, setMentorPickerFor] = useState(null);

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
      const body = {
        name,
        email,
        phone: phone || undefined,
        dob: dob || undefined,
        college: college || undefined,
        cohortId: cohortId || undefined,
        mentorId: mentorId || undefined,
      };
      const res = await api.post('/admin/interns', body);
      setCreateResult({ success: true, ...res.data });
      setName(''); setEmail(''); setPhone(''); setDob(''); setCollege(''); setCohortId(''); setMentorId('');
      await loadAll();
    } catch (err) {
      setCreateResult({ success: false, error: err.response?.data?.error || 'Failed to create intern' });
    } finally {
      setSubmitting(false);
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
          <p className="text-gray-600 text-sm mt-1">Create intern accounts and assign them to a mentor and/or cohort</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setCreateResult(null); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium">
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
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Karthik Raman" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="karthik@example.com" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone number (optional)</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="9876543210" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of birth (optional)</label>
                <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">College / University (optional)</label>
              <input type="text" value={college} onChange={(e) => setCollege(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="SSN College of Engineering" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mentor (optional - can assign later)</label>
                <select value={mentorId} onChange={(e) => setMentorId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">No mentor yet</option>
                  {activeMentors.map((m) => (<option key={m.id} value={m.id}>{m.name} ({m.email})</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cohort (optional - can assign later)</label>
                <select value={cohortId} onChange={(e) => setCohortId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">No cohort yet</option>
                  {activeCohorts.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
              </div>
            </div>
            <p className="text-xs text-gray-500">Mentor and cohort are independent - assign either, both, or neither now. An intern ID will be auto-generated (INT-XXXX).</p>

            <button type="submit" disabled={submitting} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium">
              {submitting ? 'Creating...' : 'Create Intern'}
            </button>
          </form>
        </div>
      )}

      {createResult?.success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p className="font-medium text-emerald-800">Created: {createResult.intern.name} ({createResult.intern.internId})</p>
          {createResult.emailSent ? (
            <p className="text-sm text-emerald-700 mt-1">
              A welcome email was sent to {createResult.intern.email} with login credentials and a link to set their own password.
            </p>
          ) : (
            <>
              <div className="mt-2 flex items-center gap-2 text-sm">
                <span className="text-emerald-700">Temp password:</span>
                <code className="bg-white px-2 py-0.5 rounded border border-emerald-200 font-mono text-emerald-900">{createResult.tempPassword}</code>
                <button onClick={() => copyToClipboard(createResult.tempPassword)} className="text-xs text-emerald-600 underline hover:text-emerald-800">Copy</button>
              </div>
              <p className="text-xs text-amber-600 mt-2">Email could not be sent. Share this password with the intern manually.</p>
            </>
          )}
        </div>
      )}

      {createResult?.error && (<div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{createResult.error}</div>)}

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">All Interns ({interns.length})</h3>
        {loading ? (<p className="text-gray-500 text-center py-4">Loading...</p>) : error ? (<p className="text-red-600 text-center py-4">{error}</p>) : interns.length === 0 ? (<p className="text-gray-500 text-center py-8">No interns yet. Click "+ New Intern" above.</p>) : (
          <div className="space-y-2">
            {interns.map((i) => (
              <div key={i.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-800">{i.name}</p>
                      <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full font-mono">{i.internId}</span>
                    </div>
                    <p className="text-sm text-gray-500">{i.email}{i.phone ? ` - ${i.phone}` : ''}</p>
                    {i.college && (<p className="text-xs text-gray-500 mt-0.5">{i.college}{i.dob ? ` - born ${fmtDate(i.dob)}` : ''}</p>)}
                    <p className="text-xs text-gray-500 mt-1">
                      Mentor: {i.mentor ? <strong>{i.mentor.name}</strong> : <span className="text-gray-400 italic">none</span>}
                      {' · '}
                      Cohort: {i.cohort ? <strong>{i.cohort.name}</strong> : <span className="text-gray-400 italic">none</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {i.mustChangePassword && (<span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Pending login</span>)}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${i.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>{i.status}</span>
                  </div>
                </div>

                {mentorPickerFor === i.id ? (
                  <div className="bg-purple-50 rounded-lg p-3 mt-2">
                    <p className="text-sm font-medium text-purple-800 mb-2">Pick a mentor for {i.name}:</p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {i.mentor && (
                        <button onClick={() => handleAssignMentor(i.id, null)} className="w-full text-left text-sm px-3 py-2 rounded bg-white hover:bg-red-50 text-red-600">
                          Remove current mentor ({i.mentor.name})
                        </button>
                      )}
                      {activeMentors.length === 0 ? (<p className="text-sm text-gray-500">No active mentors. Create one first.</p>) : (
                        activeMentors.map((m) => {
                          const isCurrent = i.mentor?.id === m.id;
                          return (
                            <button key={m.id} onClick={() => handleAssignMentor(i.id, m.id)} disabled={isCurrent} className={`w-full text-left text-sm px-3 py-2 rounded ${isCurrent ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white hover:bg-purple-100 text-gray-800'}`}>
                              {m.name} {isCurrent && <span className="text-xs text-emerald-600 ml-2">current</span>}
                            </button>
                          );
                        })
                      )}
                    </div>
                    <button onClick={() => setMentorPickerFor(null)} className="mt-2 text-xs text-gray-500 hover:text-gray-700 underline">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setMentorPickerFor(i.id)} className="text-xs text-purple-600 hover:text-purple-800 font-medium mt-2 mr-4">
                    {i.mentor ? 'Change mentor' : '+ Assign mentor'}
                  </button>
                )}

                {cohortPickerFor === i.id ? (
                  <div className="bg-blue-50 rounded-lg p-3 mt-3">
                    <p className="text-sm font-medium text-blue-800 mb-2">Pick a cohort for {i.name}:</p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {i.cohort && (
                        <button onClick={() => handleAssignCohort(i.id, null)} className="w-full text-left text-sm px-3 py-2 rounded bg-white hover:bg-red-50 text-red-600">
                          Remove from current cohort ({i.cohort.name})
                        </button>
                      )}
                      {activeCohorts.length === 0 ? (<p className="text-sm text-gray-500">No active cohorts. Create one first.</p>) : (
                        activeCohorts.map((c) => {
                          const isCurrent = i.cohort?.id === c.id;
                          return (
                            <button key={c.id} onClick={() => handleAssignCohort(i.id, c.id)} disabled={isCurrent} className={`w-full text-left text-sm px-3 py-2 rounded ${isCurrent ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white hover:bg-blue-100 text-gray-800'}`}>
                              {c.name} {isCurrent && <span className="text-xs text-emerald-600 ml-2">current</span>}
                            </button>
                          );
                        })
                      )}
                    </div>
                    <button onClick={() => setCohortPickerFor(null)} className="mt-2 text-xs text-gray-500 hover:text-gray-700 underline">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setCohortPickerFor(i.id)} className="text-xs text-blue-600 hover:text-blue-800 font-medium mt-2">
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