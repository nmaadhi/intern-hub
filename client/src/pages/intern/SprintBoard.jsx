import { useEffect, useState, useCallback } from 'react';
import api from '../../lib/api';
import useAuthStore from '../../store/authStore';
import KanbanBoard from '../../components/KanbanBoard';
import BurndownChart from '../../components/BurndownChart';
import ActivityFeed from '../../components/ActivityFeed';
import { socket } from '../../lib/socket';

const PHASE_CONFIG = {
  PLANNING: {
    icon: '📋',
    label: 'Planning',
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    message: 'Your mentor is planning this sprint. Cards and story points are being set up. You\'ll see the board once the sprint starts.',
    bgColor: 'bg-amber-50 border-amber-200',
    textColor: 'text-amber-800',
  },
  ACTIVE: {
    icon: '🏃',
    label: 'Active',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    message: 'Sprint is live! Drag your assigned cards to update their status.',
    bgColor: 'bg-blue-50 border-blue-200',
    textColor: 'text-blue-800',
  },
  REVIEW: {
    icon: '🔍',
    label: 'Review',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    message: 'Sprint has ended. Your mentor is reviewing the work. The board is now read-only.',
    bgColor: 'bg-purple-50 border-purple-200',
    textColor: 'text-purple-800',
  },
  COMPLETED: {
    icon: '✅',
    label: 'Completed',
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    message: 'Sprint completed! Here\'s the final summary and velocity.',
    bgColor: 'bg-emerald-50 border-emerald-200',
    textColor: 'text-emerald-800',
  },
};

function HowToUse({ phase }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-gray-50 transition">
        <span className="text-sm font-medium text-gray-700">📖 How to use the Sprint Board</span>
        <span className="text-gray-400 text-xs">{open ? '▲ Hide' : '▼ Show'}</span>
      </button>
      {open && (
        <div className="px-5 pb-5 text-xs text-gray-600 border-t border-gray-100 pt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={`p-3 rounded-xl border ${phase === 'PLANNING' ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
              <p className="font-bold text-amber-600 mb-2">📋 When sprint is PLANNING</p>
              <ul className="space-y-1">
                <li>→ Your mentor is adding cards and setting story points</li>
                <li>→ You'll be notified when the sprint starts</li>
                <li>→ Check back here once your mentor starts the sprint</li>
              </ul>
            </div>
            <div className={`p-3 rounded-xl border ${phase === 'ACTIVE' ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
              <p className="font-bold text-blue-600 mb-2">🏃 When sprint is ACTIVE</p>
              <ul className="space-y-1">
                <li>→ <strong>Drag any card</strong> to move it between columns</li>
                <li>→ <strong>To Do</strong> → start working on it</li>
                <li>→ <strong>In Progress</strong> → you're working on it now</li>
                <li>→ <strong>Review</strong> → done, waiting for mentor check</li>
                <li>→ <strong>Done</strong> → fully completed</li>
                <li>→ Red cards are <strong>blocked</strong> — talk to your mentor</li>
              </ul>
            </div>
            <div className={`p-3 rounded-xl border ${phase === 'REVIEW' ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'}`}>
              <p className="font-bold text-purple-600 mb-2">🔍 When sprint is REVIEW</p>
              <ul className="space-y-1">
                <li>→ Sprint has ended, board is <strong>read-only</strong></li>
                <li>→ Your mentor is reviewing the results</li>
                <li>→ Check the summary to see how the team did</li>
              </ul>
            </div>
            <div className={`p-3 rounded-xl border ${phase === 'COMPLETED' ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}>
              <p className="font-bold text-emerald-600 mb-2">✅ When sprint is COMPLETED</p>
              <ul className="space-y-1">
                <li>→ See your team's <strong>velocity</strong> (points completed)</li>
                <li>→ Read your mentor's <strong>retrospective notes</strong></li>
                <li>→ A new sprint will start soon</li>
              </ul>
            </div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
            <p className="font-bold text-yellow-700 mb-1">💡 Story Points Guide</p>
            <div className="flex gap-3 flex-wrap">
              {[[1,'tiny'], [2,'small'], [3,'medium'], [5,'large'], [8,'very large'], [13,'huge']].map(([p, l]) => (
                <span key={p} className="text-xs bg-white border border-yellow-200 px-2 py-0.5 rounded font-medium">
                  <strong>{p}</strong> = {l}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Planning Phase (intern view) ────────────────────────────────────
function PlanningView({ sprint }) {
  const fmtDate = (s) => s ? new Date(s).toLocaleDateString([], { dateStyle: 'medium' }) : '';

  return (
    <div className="space-y-4">
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
        <div className="text-4xl mb-3">📋</div>
        <h3 className="font-bold text-amber-900 text-lg">Sprint Being Planned</h3>
        <p className="text-sm text-amber-700 mt-2 max-w-md mx-auto">
          Your mentor is setting up this sprint — adding cards and estimating story points.
          You'll be able to see and interact with the board once the sprint starts.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-3">Upcoming Sprint Details</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500">Sprint Name</p>
            <p className="font-medium text-gray-800 mt-0.5">{sprint.name}</p>
          </div>
          <div>
            <p className="text-gray-500">Duration</p>
            <p className="font-medium text-gray-800 mt-0.5">{fmtDate(sprint.startDate)} → {fmtDate(sprint.endDate)}</p>
          </div>
          {sprint.goal && (
            <div className="col-span-2">
              <p className="text-gray-500">Sprint Goal</p>
              <p className="font-medium text-gray-800 mt-0.5">🎯 {sprint.goal}</p>
            </div>
          )}
          {sprint.capacity > 0 && (
            <div>
              <p className="text-gray-500">Team Capacity</p>
              <p className="font-medium text-gray-800 mt-0.5">{sprint.capacity} story points</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Active Phase (intern view) ──────────────────────────────────────
function ActiveView({ sprint, board, burndown, userId, cohortId, onTaskMove }) {
  const daysRemaining = Math.max(0, Math.ceil((new Date(sprint.endDate) - new Date()) / 86400000));
  const myTasks = board ? Object.values(board.columns).flat().filter((t) => t.assignedToId === userId) : [];
  const myDone = myTasks.filter((t) => t.status === 'DONE').length;
  const myPoints = myTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  const myDonePoints = myTasks.filter((t) => t.status === 'DONE').reduce((sum, t) => sum + (t.storyPoints || 0), 0);

  return (
    <div className="space-y-5">
      {sprint.goal && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-800">
          🎯 Sprint goal: <span className="font-medium">{sprint.goal}</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl shadow-sm p-4 border-l-4 border-red-400">
          <p className="text-xs text-gray-500 uppercase font-medium">Days Left</p>
          <p className={`text-3xl font-bold mt-1 ${daysRemaining <= 2 ? 'text-red-600' : 'text-gray-800'}`}>{daysRemaining}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 border-l-4 border-purple-500">
          <p className="text-xs text-gray-500 uppercase font-medium">My Cards</p>
          <p className="text-3xl font-bold mt-1 text-gray-800">{myDone}/{myTasks.length}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 border-l-4 border-blue-500">
          <p className="text-xs text-gray-500 uppercase font-medium">My Points</p>
          <p className="text-3xl font-bold mt-1 text-gray-800">{myDonePoints}/{myPoints}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 border-l-4 border-emerald-500">
          <p className="text-xs text-gray-500 uppercase font-medium">Team Progress</p>
          <p className="text-3xl font-bold mt-1 text-gray-800">{board?.stats?.progressPct || 0}%</p>
        </div>
      </div>

      {/* My tasks highlight */}
      {myTasks.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="font-bold text-gray-800 mb-3">My Cards ({myTasks.length})</h3>
          <div className="space-y-2">
            {myTasks.map((task) => (
              <div key={task.id} className={`flex items-center justify-between p-3 rounded-xl ${task.blocked ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                <div>
                  <p className="text-sm font-medium text-gray-800">{task.title}</p>
                  {task.blocked && <p className="text-xs text-red-600 mt-0.5">🚫 Blocked by mentor</p>}
                </div>
                <div className="flex items-center gap-2">
                  {task.storyPoints > 0 && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded font-bold">{task.storyPoints}pts</span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    task.status === 'DONE' ? 'bg-emerald-100 text-emerald-700' :
                    task.status === 'REVIEW' ? 'bg-amber-100 text-amber-700' :
                    task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-200 text-gray-600'
                  }`}>
                    {task.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Burndown */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-4">Team Burndown</h3>
        <BurndownChart
          snapshots={burndown.snapshots}
          idealLine={burndown.idealLine}
          totalPoints={burndown.totalPoints}
          phase="ACTIVE"
        />
      </div>

      {/* Full board */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="font-bold text-gray-800">Sprint Board</h3>
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-500">Drag any card to move it between columns</p>
            <ActivityFeed cohortId={cohortId} />
          </div>
        </div>
        {board && (
          <KanbanBoard
            board={board}
            role="INTERN"
            userId={userId}
            onTaskMove={onTaskMove}
            onTaskBlock={() => {}}
            onTaskDelete={() => {}}
          />
        )}
      </div>
    </div>
  );
}

// ── Review Phase (intern view) ──────────────────────────────────────
function ReviewView({ sprint, board, burndown }) {
  const allTasks = board ? Object.values(board.columns).flat() : [];
  const doneTasks = board?.columns?.DONE || [];
  const totalPoints = allTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  const completedPoints = doneTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);

  return (
    <div className="space-y-5">
      <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5 text-center">
        <div className="text-4xl mb-2">🔍</div>
        <h3 className="font-bold text-purple-900">Sprint Under Review</h3>
        <p className="text-sm text-purple-700 mt-1">Your mentor is reviewing the sprint results. The board is now read-only.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-gray-800">{doneTasks.length}/{allTasks.length}</p>
          <p className="text-xs text-gray-500 mt-1">Cards Done</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{completedPoints}</p>
          <p className="text-xs text-gray-500 mt-1">Points Completed</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-gray-400">{totalPoints - completedPoints}</p>
          <p className="text-xs text-gray-500 mt-1">Points Remaining</p>
        </div>
      </div>

      {/* Burndown */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-4">Sprint Burndown</h3>
        <BurndownChart
          snapshots={burndown.snapshots}
          idealLine={burndown.idealLine}
          totalPoints={burndown.totalPoints}
          phase="REVIEW"
        />
      </div>

      {/* Read-only board */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-4">Final Board State</h3>
        {board && (
          <KanbanBoard
            board={board}
            role="INTERN"
            userId={null}
            onTaskMove={() => {}}
            onTaskBlock={() => {}}
            onTaskDelete={() => {}}
            readOnly
          />
        )}
      </div>
    </div>
  );
}

// ── Completed Phase (intern view) ───────────────────────────────────
function CompletedView({ sprint, board, burndown }) {
  const allTasks = board ? Object.values(board.columns).flat() : [];
  const doneTasks = board?.columns?.DONE || [];
  const totalPoints = allTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  const fmtDate = (s) => s ? new Date(s).toLocaleDateString([], { dateStyle: 'medium' }) : '';

  return (
    <div className="space-y-5">
      {/* Velocity banner */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 text-white text-center">
        <p className="text-sm font-medium opacity-90 mb-1">🏆 Sprint Velocity</p>
        <p className="text-6xl font-black">{sprint.velocity}</p>
        <p className="text-sm opacity-80 mt-1">story points completed</p>
        <p className="text-xs opacity-70 mt-2">{fmtDate(sprint.startDate)} → {fmtDate(sprint.endDate)}</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-gray-800">{doneTasks.length}</p>
          <p className="text-xs text-gray-500 mt-1">Cards Done</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-gray-800">{allTasks.length}</p>
          <p className="text-xs text-gray-500 mt-1">Total Cards</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{sprint.velocity}</p>
          <p className="text-xs text-gray-500 mt-1">Points Done</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-gray-800">{totalPoints}</p>
          <p className="text-xs text-gray-500 mt-1">Points Planned</p>
        </div>
      </div>

      {/* Mentor review notes */}
      {sprint.reviewNotes && (
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="font-bold text-gray-800 mb-3">Mentor's Retrospective</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{sprint.reviewNotes}</p>
        </div>
      )}

      {/* Burndown */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-4">Sprint Burndown (Archived)</h3>
        <BurndownChart
          snapshots={burndown.snapshots}
          idealLine={burndown.idealLine}
          totalPoints={burndown.totalPoints}
          phase="COMPLETED"
        />
      </div>

      {/* Archived board */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-4">Final Board (Archived)</h3>
        {board && (
          <KanbanBoard
            board={board}
            role="INTERN"
            userId={null}
            onTaskMove={() => {}}
            onTaskBlock={() => {}}
            onTaskDelete={() => {}}
            readOnly
          />
        )}
      </div>
    </div>
  );
}

// ── Main Intern Sprint Board ─────────────────────────────────────────
export default function InternSprintBoard() {
  const user = useAuthStore((s) => s.user);
  const [cohortId, setCohortId] = useState(null);
  const [sprints, setSprints] = useState([]);
  const [selectedSprintId, setSelectedSprintId] = useState('');
  const [sprint, setSprint] = useState(null);
  const [board, setBoard] = useState(null);
  const [burndown, setBurndown] = useState({ snapshots: [], idealLine: [], totalPoints: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load intern's cohort
  useEffect(() => {
    api.get('/intern/me').then((res) => {
      const cId = res.data.profile?.cohort?.id;
      if (cId) setCohortId(cId);
      else setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Load sprints for cohort
  useEffect(() => {
    if (!cohortId) return;
    api.get(`/sprint/sprints?cohortId=${cohortId}`).then((res) => {
      const list = res.data.sprints || [];
      setSprints(list);
      // Auto-select active sprint first
      const active = list.find((s) => s.phase === 'ACTIVE');
      const planning = list.find((s) => s.phase === 'PLANNING');
      const review = list.find((s) => s.phase === 'REVIEW');
      const selected = active || review || planning || list[0];
      setSelectedSprintId(selected?.id || '');
    });
  }, [cohortId]);

  const loadBoard = useCallback(async () => {
    if (!selectedSprintId) { setBoard(null); setSprint(null); setLoading(false); return; }
    setLoading(true);
    try {
      const [boardRes, burndownRes] = await Promise.all([
        api.get(`/sprint/sprints/${selectedSprintId}/board`),
        api.get(`/sprint/sprints/${selectedSprintId}/burndown`),
      ]);
      setBoard(boardRes.data.board);
      setSprint(boardRes.data.board);
      setBurndown({
        snapshots: burndownRes.data.snapshots || [],
        idealLine: burndownRes.data.idealLine || [],
        totalPoints: burndownRes.data.totalPoints || 0,
      });
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load board');
    } finally {
      setLoading(false);
    }
  }, [selectedSprintId]);

  useEffect(() => { loadBoard(); }, [loadBoard]);

  // Socket events
  useEffect(() => {
    if (!cohortId) return;
    socket.emit('join:cohort', cohortId);

    const onTaskMoved = ({ taskId, newStatus, task }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        const newCols = { ...prev.columns };
        for (const col of Object.keys(newCols)) {
          newCols[col] = newCols[col].filter((t) => t.id !== taskId);
        }
        newCols[newStatus] = [...(newCols[newStatus] || []), task];
        return { ...prev, columns: newCols };
      });
      // Refresh burndown after card moves
      setTimeout(() => {
        api.get(`/sprint/sprints/${selectedSprintId}/burndown`).then((res) => {
          setBurndown({
            snapshots: res.data.snapshots || [],
            idealLine: res.data.idealLine || [],
            totalPoints: res.data.totalPoints || 0,
          });
        }).catch(() => {});
      }, 600);
    };

    const onTaskCreated = ({ task }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        return { ...prev, columns: { ...prev.columns, TODO: [...prev.columns.TODO, task] } };
      });
    };

    const onTaskDeleted = ({ taskId }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        const newCols = { ...prev.columns };
        for (const col of Object.keys(newCols)) {
          newCols[col] = newCols[col].filter((t) => t.id !== taskId);
        }
        return { ...prev, columns: newCols };
      });
    };

    const onTaskBlocked = ({ taskId, blocked }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        const newCols = { ...prev.columns };
        for (const col of Object.keys(newCols)) {
          newCols[col] = newCols[col].map((t) => t.id === taskId ? { ...t, blocked } : t);
        }
        return { ...prev, columns: newCols };
      });
    };

    const onTaskPointsUpdated = ({ taskId, storyPoints }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        const newCols = { ...prev.columns };
        for (const col of Object.keys(newCols)) {
          newCols[col] = newCols[col].map((t) => t.id === taskId ? { ...t, storyPoints } : t);
        }
        return { ...prev, columns: newCols };
      });
    };

    const onPhaseChanged = ({ phase, velocity }) => {
      setSprint((prev) => prev ? { ...prev, phase, velocity } : prev);
      // Reload full board on phase change
      loadBoard();
      // Update sprints list phase badge
      setSprints((prev) => prev.map((s) =>
        s.id === selectedSprintId ? { ...s, phase, velocity } : s
      ));
    };

    socket.on('task:moved', onTaskMoved);
    socket.on('task:created', onTaskCreated);
    socket.on('task:deleted', onTaskDeleted);
    socket.on('task:blocked', onTaskBlocked);
    socket.on('task:points_updated', onTaskPointsUpdated);
    socket.on('sprint:phase_changed', onPhaseChanged);

    return () => {
      socket.off('task:moved', onTaskMoved);
      socket.off('task:created', onTaskCreated);
      socket.off('task:deleted', onTaskDeleted);
      socket.off('task:blocked', onTaskBlocked);
      socket.off('task:points_updated', onTaskPointsUpdated);
      socket.off('sprint:phase_changed', onPhaseChanged);
    };
  }, [cohortId, selectedSprintId, loadBoard]);

  const handleTaskMove = async (taskId, newStatus) => {
    // Optimistic update
    setBoard((prev) => {
      if (!prev) return prev;
      const newCols = { ...prev.columns };
      let movedTask = null;
      for (const col of Object.keys(newCols)) {
        const found = newCols[col].find((t) => t.id === taskId);
        if (found) movedTask = { ...found, status: newStatus };
        newCols[col] = newCols[col].filter((t) => t.id !== taskId);
      }
      if (movedTask) newCols[newStatus] = [...newCols[newStatus], movedTask];
      return { ...prev, columns: newCols };
    });
    try {
      await api.patch(`/sprint/tasks/${taskId}/move`, { status: newStatus });
    } catch (err) {
      alert(err.response?.data?.error || 'You can only move cards assigned to you');
      loadBoard();
    }
  };

  const fmtDate = (s) => s ? new Date(s).toLocaleDateString([], { dateStyle: 'medium' }) : '';
  const phase = sprint?.phase;
  const phaseConfig = phase ? PHASE_CONFIG[phase] : null;

  if (loading) return <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-500">Loading sprint board...</div>;

  if (!cohortId) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
        <div className="text-4xl mb-3">🏃</div>
        <h3 className="font-bold text-amber-900">No Cohort Assigned</h3>
        <p className="text-sm text-amber-700 mt-1">You need to be assigned to a cohort to see the sprint board. Contact your admin.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Sprint Board</h2>
        <p className="text-sm text-gray-500 mt-0.5">Your team's Agile sprint progress</p>
      </div>

      {/* Sprint selector */}
      {sprints.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-sm font-medium text-gray-700 shrink-0">Sprint:</label>
          <div className="flex gap-2 flex-wrap">
            {sprints.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSprintId(s.id)}
                className={`text-sm px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5
                  ${selectedSprintId === s.id ? 'bg-emerald-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:border-emerald-400'}`}
              >
                {PHASE_CONFIG[s.phase]?.icon} {s.name}
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${selectedSprintId === s.id ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                  {s.phase}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <HowToUse phase={phase} />

      {/* Phase info strip */}
      {sprint && phaseConfig && (
        <div className={`border rounded-xl px-4 py-3 flex items-center gap-3 ${phaseConfig.bgColor}`}>
          <span className="text-lg">{phaseConfig.icon}</span>
          <div className="flex-1">
            <span className={`text-xs font-bold uppercase tracking-wider ${phaseConfig.textColor}`}>{phaseConfig.label} Phase</span>
            <p className={`text-xs mt-0.5 ${phaseConfig.textColor} opacity-80`}>{phaseConfig.message}</p>
          </div>
          <span className="text-xs text-gray-500 shrink-0">{fmtDate(sprint.startDate)} → {fmtDate(sprint.endDate)}</span>
        </div>
      )}

      {/* Error */}
      {error && (<div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm">{error}</div>)}

      {/* No sprints */}
      {sprints.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-500">
          <div className="text-4xl mb-3">📋</div>
          <p className="font-medium">No sprints yet</p>
          <p className="text-sm text-gray-400 mt-1">Your mentor will create a sprint soon.</p>
        </div>
      )}

      {/* Phase-specific views */}
      {sprint && phase === 'PLANNING' && (
        <PlanningView sprint={sprint} />
      )}

      {sprint && phase === 'ACTIVE' && (
        <ActiveView
          sprint={sprint}
          board={board}
          burndown={burndown}
          userId={user?.id}
          cohortId={cohortId}
          onTaskMove={handleTaskMove}
        />
      )}

      {sprint && phase === 'REVIEW' && (
        <ReviewView sprint={sprint} board={board} burndown={burndown} />
      )}

      {sprint && phase === 'COMPLETED' && (
        <CompletedView sprint={sprint} board={board} burndown={burndown} />
      )}
    </div>
  );
}