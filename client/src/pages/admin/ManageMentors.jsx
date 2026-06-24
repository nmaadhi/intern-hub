import { useEffect, useState } from 'react';
import api from '../../lib/api';
import { useFormPersist } from '../../hooks/useFormPersist';

function ManageMentors() {
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createResult, setCreateResult] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const { values, setValue, resetForm } = useFormPersist('admin-create-mentor', {
    name: '', email: '', phone: '',
  });

  const loadMentors = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/mentors');
      setMentors(res.data.mentors || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load mentors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMentors(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setCreateResult(null);
    try {
      const res = await api.post('/admin/mentors', {
        name: values.name,
        email: values.email,
        phone: values.phone || undefined,
      });
      setCreateResult({ success: true, ...res.data });
      resetForm();
      await loadMentors();
    } catch (err) {
      setCreateResult({ success: false, error: err.response?.data?.error || 'Failed to create mentor' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (mentor) => {
    const newStatus = mentor.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const msg = newStatus === 'INACTIVE'
      ? `Deactivate ${mentor.name}? They will not be able to login.`
      : `Activate ${mentor.name}? They will be able to login again.`;
    if (!window.confirm(msg)) return;
    setActionLoadingId(mentor.id);
    try {
      await api.patch(`/admin/mentors/${mentor.id}/status`, { status: newStatus });
      await loadMentors();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (mentor) => {
    if (!window.confirm(`Permanently delete ${mentor.name}? This cannot be undone and will remove all their data.`)) return;
    setActionLoadingId(mentor.id);
    try {
      await api.delete(`/admin/mentors/${mentor.id}`);
      setMentors((prev) => prev.filter((m) => m.id !== mentor.id));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete mentor');
    } finally {
      setActionLoadingId(null);
    }
  };

  const copyToClipboard = (text) => { navigator.clipboard.writeText(text); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Manage Mentors</h2>
          <p className="text-gray-600 text-sm mt-1">Create mentor accounts and manage access</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setCreateResult(null); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
        >
          {showForm ? 'Cancel' : '+ New Mentor'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Add a new mentor</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full name</label>
              <input
                type="text" value={values.name}
                onChange={(e) => setValue('name', e.target.value)}
                required minLength={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Priya Singh"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
              <input
                type="email" value={values.email}
                onChange={(e) => setValue('email', e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="priya@company.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone number (optional)</label>
              <input
                type="tel" value={values.phone}
                onChange={(e) => setValue('phone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="9876543210"
              />
            </div>
            <button
              type="submit" disabled={submitting}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium"
            >
              {submitting ? 'Creating...' : 'Create Mentor'}
            </button>
          </form>
        </div>
      )}

      {createResult?.success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p className="font-medium text-emerald-800">Created: {createResult.mentor.name}</p>
          {createResult.emailSent ? (
            <p className="text-sm text-emerald-700 mt-1">Welcome email sent to {createResult.mentor.email}</p>
          ) : (
            <>
              <div className="mt-2 flex items-center gap-2 text-sm">
                <span className="text-emerald-700">Temporary password:</span>
                <code className="bg-white px-2 py-0.5 rounded border border-emerald-200 font-mono text-emerald-900">
                  {createResult.tempPassword}
                </code>
                <button onClick={() => copyToClipboard(createResult.tempPassword)}
                  className="text-xs text-emerald-600 underline hover:text-emerald-800">Copy</button>
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
        <h3 className="text-lg font-bold text-gray-800 mb-4">All Mentors ({mentors.length})</h3>
        {loading ? (
          <p className="text-gray-500 text-center py-4">Loading...</p>
        ) : error ? (
          <p className="text-red-600 text-center py-4">{error}</p>
        ) : mentors.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No mentors yet.</p>
        ) : (
          <div className="space-y-3">
            {mentors.map((m) => (
              <div key={m.id} className={`p-4 rounded-xl border ${m.status === 'INACTIVE' ? 'bg-gray-50 border-gray-200 opacity-75' : 'bg-white border-gray-200'}`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-gray-800">{m.name}</p>
                      {m.mustChangePassword && (
                        <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Pending login</span>
                      )}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        m.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                      }`}>
                        {m.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">{m.email}{m.phone ? ` · ${m.phone}` : ''}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{m.cohortCount} cohort{m.cohortCount !== 1 ? 's' : ''} assigned</p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleStatus(m)}
                      disabled={actionLoadingId === m.id}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition disabled:opacity-50 ${
                        m.status === 'ACTIVE'
                          ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                          : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                      }`}
                    >
                      {actionLoadingId === m.id ? '...' : m.status === 'ACTIVE' ? '🔒 Deactivate' : '✅ Activate'}
                    </button>
                    <button
                      onClick={() => handleDelete(m)}
                      disabled={actionLoadingId === m.id}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium bg-red-100 text-red-600 hover:bg-red-200 transition disabled:opacity-50"
                    >
                      🗑 Delete
                    </button>
                  </div>
                </div>

                {m.status === 'INACTIVE' && (
                  <p className="text-xs text-red-500 mt-2">
                    ⚠️ This mentor is deactivated and cannot login.
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ManageMentors;