import { useEffect, useState } from 'react';
import api from '../../lib/api';

const STATUS_COLORS = {
  TODO: 'bg-gray-100 text-gray-600',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  DONE: 'bg-emerald-100 text-emerald-700',
};

const STATUS_LABELS = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
};

function ManageTasks() {
  const [tasks, setTasks] = useState([]);
  const [interns, setInterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [assignedToId, setAssignedToId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createMessage, setCreateMessage] = useState(null);

  const [filterIntern, setFilterIntern] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const loadAll = async () => {
    setLoading(true);
    try {
      const [tRes, iRes] = await Promise.all([
        api.get('/mentor/tasks'),
        api.get('/mentor/interns'),
      ]);
      setTasks(tRes.data.tasks || []);
      setInterns(iRes.data.interns || []);
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
      await api.post('/mentor/tasks', {
        assignedToId,
        title,
        description: description || undefined,
        dueDate: dueDate || undefined,
      });
      setCreateMessage({ success: true });
      setTitle(''); setDescription(''); setDueDate(''); setAssignedToId('');
      await loadAll();
    } catch (err) {
      setCreateMessage({ success: false, error: err.response?.data?.error || 'Failed to create task' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (taskId, status) => {
    try {
      await api.patch(`/mentor/tasks/${taskId}`, { status });
      await loadAll();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status');
    }
  };

  const handleDelete = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await api.delete(`/mentor/tasks/${taskId}`);
      await loadAll();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete task');
    }
  };

  const fmtDate = (s) => s ? new Date(s).toLocaleDateString() : null;

  const filteredTasks = tasks.filter((t) => {
    if (filterIntern !== 'all' && t.assignedTo.id !== filterIntern) return false;
    if (filterStatus !== 'all' && t.status !== filterStatus) return false;
    return true;
  });

  const todoCount = tasks.filter((t) => t.status === 'TODO').length;
  const inProgressCount = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const doneCount = tasks.filter((t) => t.status === 'DONE').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Tasks</h2>
          <p className="text-gray-600 text-sm mt-1">Assign and track individual tasks for your interns</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setCreateMessage(null); }} className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition font-medium">
          {showForm ? 'Cancel' : '+ New Task'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-gray-700">{todoCount}</p>
          <p className="text-xs text-gray-500 mt-1">To Do</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{inProgressCount}</p>
          <p className="text-xs text-gray-500 mt-1">In Progress</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{doneCount}</p>
          <p className="text-xs text-gray-500 mt-1">Done</p>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Assign a new task</h3>
          {interns.length === 0 ? (
            <p className="text-sm text-gray-500">No directly assigned interns yet. Ask admin to assign interns to you first.</p>
          ) : (
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign to</label>
                <select value={assignedToId} onChange={(e) => setAssignedToId(e.target.value)} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="">Select an intern</option>
                  {interns.map((i) => (<option key={i.id} value={i.id}>{i.name} ({i.internId})</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required minLength={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Set up the development environment" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Any additional details..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due date (optional)</label>
                <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <button type="submit" disabled={submitting} className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition font-medium">
                {submitting ? 'Creating...' : 'Create Task'}
              </button>
            </form>
          )}
        </div>
      )}

      {createMessage?.success && (<div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-800">Task created successfully.</div>)}
      {createMessage?.error && (<div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{createMessage.error}</div>)}

      {/* Filters */}
      {tasks.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          <select value={filterIntern} onChange={(e) => setFilterIntern(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
            <option value="all">All interns</option>
            {interns.map((i) => (<option key={i.id} value={i.id}>{i.name}</option>))}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500">
            <option value="all">All statuses</option>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="DONE">Done</option>
          </select>
          {(filterIntern !== 'all' || filterStatus !== 'all') && (
            <button onClick={() => { setFilterIntern('all'); setFilterStatus('all'); }} className="text-sm text-gray-500 underline">Clear filters</button>
          )}
        </div>
      )}

      <div className="space-y-2">
        {loading ? (<p className="text-gray-500 text-center py-4">Loading...</p>) : error ? (<p className="text-red-600 text-center py-4">{error}</p>) : filteredTasks.length === 0 ? (
          <p className="text-gray-500 text-center py-8 bg-white rounded-2xl shadow-sm">
            {tasks.length === 0 ? 'No tasks yet. Create one above.' : 'No tasks match the selected filters.'}
          </p>
        ) : (
          filteredTasks.map((t) => (
            <div key={t.id} className="bg-white rounded-2xl shadow-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-gray-800">{t.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[t.status]}`}>{STATUS_LABELS[t.status]}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {t.assignedTo.name} ({t.assignedTo.internId})
                    {fmtDate(t.dueDate) ? ` · due ${fmtDate(t.dueDate)}` : ''}
                  </p>
                  {t.description && (<p className="text-sm text-gray-600 mt-1">{t.description}</p>)}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select value={t.status} onChange={(e) => handleStatusChange(t.id, e.target.value)} className="text-xs border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-purple-500">
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="DONE">Done</option>
                  </select>
                  <button onClick={() => handleDelete(t.id)} className="text-xs text-red-400 hover:text-red-600 transition">Delete</button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ManageTasks;