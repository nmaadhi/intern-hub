import { useEffect, useState } from 'react';
import api from '../../lib/api';

export default function Announcements() {
  const [cohorts, setCohorts] = useState([]);
  const [selectedCohortId, setSelectedCohortId] = useState('');
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [pinned, setPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    api.get('/mentor/cohorts').then((res) => {
      const list = res.data.cohorts || [];
      setCohorts(list);
      if (list.length > 0) setSelectedCohortId(list[0].id);
    });
  }, []);

  const loadAnnouncements = async () => {
    if (!selectedCohortId) return;
    setLoading(true);
    try {
      const res = await api.get(`/announcement?cohortId=${selectedCohortId}`);
      setAnnouncements(res.data.announcements || []);
    } catch (err) {
      console.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAnnouncements(); }, [selectedCohortId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await api.post('/announcement', {
        cohortId: selectedCohortId,
        title, content, pinned,
      });
      setAnnouncements((prev) => [res.data.announcement, ...prev]);
      setTitle(''); setContent(''); setPinned(false);
      setShowForm(false);
      setMessage({ success: true, text: 'Announcement posted! Interns can see it now.' });
    } catch (err) {
      setMessage({ success: false, text: err.response?.data?.error || 'Failed to post' });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePin = async (id) => {
    try {
      const res = await api.patch(`/announcement/${id}/pin`);
      setAnnouncements((prev) =>
        prev.map((a) => a.id === id ? res.data.announcement : a)
          .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
      );
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try {
      await api.delete(`/announcement/${id}`);
      setAnnouncements((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete');
    }
  };

  const fmtDate = (s) => new Date(s).toLocaleDateString([], { dateStyle: 'medium' });
  const fmtTime = (s) => new Date(s).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Announcements</h2>
          <p className="text-sm text-gray-500 mt-1">Post updates to your cohort — interns see them instantly</p>
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
            onClick={() => { setShowForm(!showForm); setMessage(null); }}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition text-sm font-medium"
          >
            {showForm ? 'Cancel' : '📢 New Announcement'}
          </button>
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="font-bold text-gray-800 mb-4">Post an announcement</h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Session tomorrow at 10am"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                placeholder="Please join the session at 10am instead of 9am tomorrow. Link will be shared in meetings."
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={pinned}
                onChange={(e) => setPinned(e.target.checked)}
                className="accent-purple-600 w-4 h-4"
              />
              <span className="text-sm text-gray-700">📌 Pin this announcement (shows at top)</span>
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition text-sm font-medium"
            >
              {submitting ? 'Posting...' : '📢 Post Announcement'}
            </button>
          </form>
        </div>
      )}

      {message && (
        <div className={`p-4 rounded-xl text-sm ${message.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.text}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="bg-white rounded-2xl p-8 text-center text-gray-500">Loading...</div>
      ) : announcements.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-500">
          <p className="text-4xl mb-3">📢</p>
          <p className="font-medium">No announcements yet</p>
          <p className="text-sm text-gray-400 mt-1">Post an announcement and interns will see it instantly on their dashboard</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className={`bg-white rounded-2xl shadow-sm p-5 border-l-4 ${a.pinned ? 'border-amber-400' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {a.pinned && (<span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">📌 Pinned</span>)}
                    <h3 className="font-bold text-gray-800">{a.title}</h3>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{a.content}</p>
                  <p className="text-xs text-gray-400 mt-2">{fmtDate(a.createdAt)} at {fmtTime(a.createdAt)}</p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handlePin(a.id)}
                    className={`text-xs px-2 py-1 rounded-lg transition ${a.pinned ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    {a.pinned ? 'Unpin' : '📌 Pin'}
                  </button>
                  <button
                    onClick={() => handleDelete(a.id)}
                    className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}