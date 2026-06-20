import { useEffect, useState } from 'react';
import { socket } from '../lib/socket';

const STATUS_LABELS = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  REVIEW: 'Review',
  DONE: 'Done',
};

const STATUS_COLORS = {
  TODO: 'text-gray-500',
  IN_PROGRESS: 'text-blue-600',
  REVIEW: 'text-amber-600',
  DONE: 'text-emerald-600',
};

const ROLE_COLORS = {
  MENTOR: 'bg-purple-100 text-purple-700',
  INTERN: 'bg-emerald-100 text-emerald-700',
};

export default function ActivityFeed({ cohortId }) {
  const [activities, setActivities] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!cohortId) return;

    const onTaskMoved = ({ task, movedBy, newStatus, oldStatus }) => {
      const entry = {
        id: Date.now(),
        type: 'MOVED',
        time: new Date(),
        user: movedBy,
        taskTitle: task?.title || 'a card',
        from: oldStatus,
        to: newStatus,
      };
      setActivities((prev) => [entry, ...prev].slice(0, 30));
    };

    const onTaskCreated = ({ task, createdBy }) => {
      const entry = {
        id: Date.now(),
        type: 'CREATED',
        time: new Date(),
        user: createdBy || { name: 'Mentor', role: 'MENTOR' },
        taskTitle: task?.title || 'a card',
      };
      setActivities((prev) => [entry, ...prev].slice(0, 30));
    };

    const onTaskBlocked = ({ task }) => {
      const entry = {
        id: Date.now(),
        type: 'BLOCKED',
        time: new Date(),
        user: { name: 'Mentor', role: 'MENTOR' },
        taskTitle: task?.title || 'a card',
        blocked: task?.blocked,
      };
      setActivities((prev) => [entry, ...prev].slice(0, 30));
    };

    const onTaskDeleted = ({ taskId }) => {
      const entry = {
        id: Date.now(),
        type: 'DELETED',
        time: new Date(),
        user: { name: 'Mentor', role: 'MENTOR' },
        taskTitle: 'a card',
      };
      setActivities((prev) => [entry, ...prev].slice(0, 30));
    };

    socket.on('task:moved', onTaskMoved);
    socket.on('task:created', onTaskCreated);
    socket.on('task:blocked', onTaskBlocked);
    socket.on('task:deleted', onTaskDeleted);

    return () => {
      socket.off('task:moved', onTaskMoved);
      socket.off('task:created', onTaskCreated);
      socket.off('task:blocked', onTaskBlocked);
      socket.off('task:deleted', onTaskDeleted);
    };
  }, [cohortId]);

  const fmtTime = (date) => {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  const renderActivity = (a) => {
    switch (a.type) {
      case 'MOVED':
        return (
          <span>
            <span className={`font-medium px-1.5 py-0.5 rounded text-xs ${ROLE_COLORS[a.user?.role] || 'bg-gray-100 text-gray-600'}`}>
              {a.user?.name || 'Someone'}
            </span>
            {' moved '}
            <span className="font-medium text-gray-800">"{a.taskTitle}"</span>
            {' '}
            <span className={`text-xs font-medium ${STATUS_COLORS[a.from]}`}>{STATUS_LABELS[a.from]}</span>
            {' → '}
            <span className={`text-xs font-medium ${STATUS_COLORS[a.to]}`}>{STATUS_LABELS[a.to]}</span>
          </span>
        );
      case 'CREATED':
        return (
          <span>
            <span className={`font-medium px-1.5 py-0.5 rounded text-xs ${ROLE_COLORS[a.user?.role] || 'bg-gray-100 text-gray-600'}`}>
              {a.user?.name || 'Mentor'}
            </span>
            {' created '}
            <span className="font-medium text-gray-800">"{a.taskTitle}"</span>
          </span>
        );
      case 'BLOCKED':
        return (
          <span>
            <span className="font-medium text-red-600">"{a.taskTitle}"</span>
            {a.blocked ? ' was blocked 🚫' : ' was unblocked ✅'}
          </span>
        );
      case 'DELETED':
        return <span>A card was deleted from the board.</span>;
      default:
        return null;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition"
      >
        <span className={`w-2 h-2 rounded-full ${activities.length > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
        Activity
        {activities.length > 0 && (
          <span className="bg-purple-100 text-purple-700 text-xs px-1.5 py-0.5 rounded-full font-medium">{activities.length}</span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-10 w-96 bg-white rounded-2xl shadow-xl border border-gray-200 z-50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <p className="font-bold text-gray-800 text-sm">Board Activity</p>
              {activities.length > 0 && (
                <button onClick={() => { setActivities([]); setOpen(false); }} className="text-xs text-gray-400 hover:text-red-500 transition">Clear</button>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto">
              {activities.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No activity yet. Move a card to see it here.</p>
              ) : (
                activities.map((a) => (
                  <div key={a.id} className="px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition">
                    <div className="text-sm text-gray-700 leading-relaxed">
                      {renderActivity(a)}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{fmtTime(a.time)}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}