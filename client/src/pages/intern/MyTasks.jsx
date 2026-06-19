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

const NEXT_STATUS = {
  TODO: 'IN_PROGRESS',
  IN_PROGRESS: 'DONE',
  DONE: null,
};

const NEXT_LABEL = {
  TODO: 'Start →',
  IN_PROGRESS: 'Mark Done ✓',
  DONE: null,
};

function MyTasks() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const loadTasks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/intern/tasks');
      setTasks(res.data.tasks || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTasks(); }, []);

  const handleAdvanceStatus = async (task) => {
    const nextStatus = NEXT_STATUS[task.status];
    if (!nextStatus) return;
    setUpdatingId(task.id);
    try {
      await api.patch(`/intern/tasks/${task.id}/status`, { status: nextStatus });
      await loadTasks();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update task');
    } finally {
      setUpdatingId(null);
    }
  };

  const fmtDate = (s) => s ? new Date(s).toLocaleDateString() : null;

  const filteredTasks = tasks.filter((t) =>
    filterStatus === 'all' ? true : t.status === filterStatus
  );

  const todoCount = tasks.filter((t) => t.status === 'TODO').length;
  const inProgressCount = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const doneCount = tasks.filter((t) => t.status === 'DONE').length;

  if (loading) return <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-500">Loading...</div>;
  if (error) return <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700">{error}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">My Tasks</h2>
        <p className="text-gray-600 text-sm mt-1">Tasks assigned by your mentor</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm p-4 text-center border-l-4 border-gray-300">
          <p className="text-2xl font-bold text-gray-700">{todoCount}</p>
          <p className="text-xs text-gray-500 mt-1">To Do</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 text-center border-l-4 border-blue-400">
          <p className="text-2xl font-bold text-blue-600">{inProgressCount}</p>
          <p className="text-xs text-gray-500 mt-1">In Progress</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 text-center border-l-4 border-emerald-400">
          <p className="text-2xl font-bold text-emerald-600">{doneCount}</p>
          <p className="text-xs text-gray-500 mt-1">Done</p>
        </div>
      </div>

      {/* Filter */}
      {tasks.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {['all', 'TODO', 'IN_PROGRESS', 'DONE'].map((s) => (
            <button key={s} onClick={() => setFilterStatus(s)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${filterStatus === s ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {s === 'all' ? 'All' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {filteredTasks.length === 0 ? (
          <p className="text-gray-500 text-center py-8 bg-white rounded-2xl shadow-sm">
            {tasks.length === 0 ? 'No tasks assigned yet.' : 'No tasks match this filter.'}
          </p>
        ) : (
          filteredTasks.map((t) => (
            <div key={t.id} className={`bg-white rounded-2xl shadow-sm p-4 border-l-4 ${t.status === 'DONE' ? 'border-emerald-400 opacity-75' : t.status === 'IN_PROGRESS' ? 'border-blue-400' : 'border-gray-300'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`font-medium ${t.status === 'DONE' ? 'line-through text-gray-400' : 'text-gray-800'}`}>{t.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[t.status]}`}>{STATUS_LABELS[t.status]}</span>
                  </div>
                  {t.description && (<p className="text-sm text-gray-600 mt-1">{t.description}</p>)}
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    {fmtDate(t.dueDate) && <span>Due {fmtDate(t.dueDate)}</span>}
                    <span>From {t.createdBy.name}</span>
                  </div>
                </div>
                {NEXT_STATUS[t.status] && (
                  <button onClick={() => handleAdvanceStatus(t)} disabled={updatingId === t.id} className={`shrink-0 text-xs px-3 py-1.5 rounded-lg font-medium transition disabled:opacity-50 ${t.status === 'TODO' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
                    {updatingId === t.id ? '...' : NEXT_LABEL[t.status]}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default MyTasks;