import { useEffect, useState, useCallback } from 'react';
import api from '../../lib/api';
import useAuthStore from '../../store/authStore';
import KanbanBoard from '../../components/KanbanBoard';
import BurndownChart from '../../components/BurndownChart';
import ActivityFeed from '../../components/ActivityFeed';
import { socket } from '../../lib/socket';

const STORY_POINTS = [0, 1, 2, 3, 5, 8, 13];

const PHASE_CONFIG = {
  PLANNING: { label: 'Planning', color: 'bg-amber-100 text-amber-700', icon: '📋', next: 'ACTIVE', nextLabel: '🚀 Start Sprint', nextColor: 'bg-blue-600 hover:bg-blue-700' },
  ACTIVE: { label: 'Active', color: 'bg-blue-100 text-blue-700', icon: '🏃', next: 'REVIEW', nextLabel: '🔍 Move to Review', nextColor: 'bg-purple-600 hover:bg-purple-700' },
  REVIEW: { label: 'Review', color: 'bg-purple-100 text-purple-700', icon: '🔍', next: 'COMPLETED', nextLabel: '✅ Complete Sprint', nextColor: 'bg-emerald-600 hover:bg-emerald-700' },
  COMPLETED: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700', icon: '✅', next: null, nextLabel: null },
};

function HowToUse() {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-gray-50 transition">
        <span className="text-sm font-medium text-gray-700">📖 How to use the Sprint Board</span>
        <span className="text-gray-400 text-xs">{open ? '▲ Hide' : '▼ Show'}</span>
      </button>
      {open && (
        <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm border-t border-gray-100 pt-4">
          <div>
            <p className="font-bold text-amber-600 mb-2">📋 PLANNING Phase</p>
            <ul className="space-y-1 text-gray-600 text-xs">
              <li>→ Set the sprint <strong>capacity</strong> (how many points your team can handle)</li>
              <li>→ Click <strong>+ Add Card</strong> to create tasks</li>
              <li>→ Set <strong>story points</strong> on each card: 1=tiny, 13=huge</li>
              <li>→ <strong>Assign cards</strong> to specific interns</li>
              <li>→ Click <strong>🚀 Start Sprint</strong> when planning is done</li>
            </ul>
          </div>
          <div>
            <p className="font-bold text-blue-600 mb-2">🏃 ACTIVE Phase</p>
            <ul className="space-y-1 text-gray-600 text-xs">
              <li>→ Board is live — all team members can see and move cards</li>
              <li>→ <strong>Drag cards</strong> between columns to update status</li>
              <li>→ <strong>Block</strong> a card if an intern is stuck (turns red)</li>
              <li>→ Watch the <strong>burndown chart</strong> drop as cards hit Done</li>
              <li>→ Click <strong>🔍 Move to Review</strong> when sprint ends</li>
            </ul>
          </div>
          <div>
            <p className="font-bold text-purple-600 mb-2">🔍 REVIEW Phase</p>
            <ul className="space-y-1 text-gray-600 text-xs">
              <li>→ Board is <strong>read-only</strong> — no more card changes</li>
              <li>→ Write your <strong>retrospective notes</strong> (what went well / didn't)</li>
              <li>→ Click <strong>✅ Complete Sprint</strong> to finalize</li>
            </ul>
          </div>
          <div>
            <p className="font-bold text-emerald-600 mb-2">✅ COMPLETED Phase</p>
            <ul className="space-y-1 text-gray-600 text-xs">
              <li>→ <strong>Velocity</strong> = total story points completed</li>
              <li>→ Use velocity to plan the <strong>next sprint's capacity</strong></li>
              <li>→ Everything is archived — create a new sprint to continue</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Planning Phase ──────────────────────────────────────────────────
function PlanningPhase({ sprint, interns, onAddTask, onDeleteTask, onUpdatePoints, onUpdateCapacity, onStartSprint, board }) {
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [taskPoints, setTaskPoints] = useState(0);
  const [addingTask, setAddingTask] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const allTasks = board ? Object.values(board.columns).flat() : [];
  const totalPlanned = allTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  const capacityPct = sprint.capacity > 0 ? Math.min(100, Math.round((totalPlanned / sprint.capacity) * 100)) : 0;
  const overCapacity = sprint.capacity > 0 && totalPlanned > sprint.capacity;

  const handleAdd = async (e) => {
    e.preventDefault();
    setAddingTask(true);
    try {
      await onAddTask({ title: taskTitle, description: taskDesc || undefined, assignedToId: taskAssignee || undefined, storyPoints: taskPoints });
      setTaskTitle(''); setTaskDesc(''); setTaskAssignee(''); setTaskPoints(0);
      setShowAddForm(false);
    } finally {
      setAddingTask(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Sprint info */}
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs font-medium text-amber-600 uppercase tracking-wider mb-1">📋 Planning Phase</p>
            <p className="text-sm text-amber-800">Add cards and set story points before starting the sprint. Interns will see the board once the sprint goes Active.</p>
          </div>
          <button onClick={onStartSprint} disabled={allTasks.length === 0} className="shrink-0 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition text-sm font-medium">
            🚀 Start Sprint
          </button>
        </div>
        {allTasks.length === 0 && (
          <p className="text-xs text-amber-600 mt-2">Add at least one card before starting.</p>
        )}
      </div>

      {/* Capacity bar */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-800">Capacity Planning</h3>
          <div className="flex items-center gap-2">
            <input
              type="number"
              defaultValue={sprint.capacity || ''}
              onBlur={(e) => onUpdateCapacity(parseInt(e.target.value) || 0)}
              placeholder="Set capacity (pts)"
              min={0}
              className="w-36 text-sm px-2 py-1 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className={`font-medium ${overCapacity ? 'text-red-600' : 'text-gray-700'}`}>{totalPlanned} pts planned</span>
          {sprint.capacity > 0 && (<><span className="text-gray-400">/</span><span className="text-gray-600">{sprint.capacity} pts capacity</span></>)}
        </div>
        {sprint.capacity > 0 && (
          <div className="mt-2">
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div className={`h-3 rounded-full transition-all ${overCapacity ? 'bg-red-500' : 'bg-purple-500'}`} style={{ width: `${Math.min(100, capacityPct)}%` }} />
            </div>
            {overCapacity && (<p className="text-xs text-red-600 mt-1">Over capacity by {totalPlanned - sprint.capacity} points — consider removing some cards.</p>)}
          </div>
        )}
      </div>

      {/* Cards list */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800">Sprint Backlog ({allTasks.length} cards)</h3>
          <button onClick={() => setShowAddForm(!showAddForm)} className="text-sm bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 transition font-medium">
            {showAddForm ? 'Cancel' : '+ Add Card'}
          </button>
        </div>

        {showAddForm && (
          <form onSubmit={handleAdd} className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
              <input type="text" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} required className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Implement user authentication" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Assign to</label>
                <select value={taskAssignee} onChange={(e) => setTaskAssignee(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="">Unassigned</option>
                  {interns.map((i) => (<option key={i.id} value={i.id}>{i.name} ({i.internId})</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Story points</label>
                <div className="flex gap-1 flex-wrap">
                  {STORY_POINTS.map((p) => (
                    <button key={p} type="button" onClick={() => setTaskPoints(p)} className={`text-xs px-2 py-1 rounded font-bold transition ${taskPoints === p ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>
                      {p === 0 ? '?' : p}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Description (optional)</label>
              <input type="text" value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Any extra context..." />
            </div>
            <button type="submit" disabled={addingTask} className="bg-purple-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition">
              {addingTask ? 'Adding...' : 'Add Card'}
            </button>
          </form>
        )}

        {allTasks.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No cards yet. Add some above to plan the sprint.</p>
        ) : (
          <div className="space-y-2">
            {allTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{task.title}</p>
                  {task.assignedTo && (<p className="text-xs text-purple-600 mt-0.5">{task.assignedTo.name}</p>)}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex gap-1">
                    {STORY_POINTS.map((p) => (
                      <button key={p} onClick={() => onUpdatePoints(task.id, p)} className={`text-xs px-1.5 py-0.5 rounded font-bold transition ${(task.storyPoints || 0) === p ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}>
                        {p === 0 ? '?' : p}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => onDeleteTask(task.id)} className="text-xs text-red-400 hover:text-red-600 transition ml-1">✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Active Phase ────────────────────────────────────────────────────
function ActivePhase({ sprint, board, burndown, interns, userId, onTaskMove, onTaskBlock, onMoveToReview, cohortId }) {
  const daysRemaining = Math.max(0, Math.ceil((new Date(sprint.endDate) - new Date()) / 86400000));

  return (
    <div className="space-y-5">
      {/* Sprint stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl shadow-sm p-4 border-l-4 border-blue-500">
          <p className="text-xs text-gray-500 uppercase font-medium">Days Left</p>
          <p className={`text-3xl font-bold mt-1 ${daysRemaining <= 2 ? 'text-red-600' : 'text-gray-800'}`}>{daysRemaining}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 border-l-4 border-purple-500">
          <p className="text-xs text-gray-500 uppercase font-medium">Points Done</p>
          <p className="text-3xl font-bold mt-1 text-gray-800">{board?.stats?.completedPoints || 0}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 border-l-4 border-amber-500">
          <p className="text-xs text-gray-500 uppercase font-medium">Remaining</p>
          <p className="text-3xl font-bold mt-1 text-gray-800">{board?.stats?.remainingPoints || 0}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 border-l-4 border-emerald-500">
          <p className="text-xs text-gray-500 uppercase font-medium">Progress</p>
          <p className="text-3xl font-bold mt-1 text-gray-800">{board?.stats?.progressPct || 0}%</p>
        </div>
      </div>

      {/* Burndown chart */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-4">Burndown Chart</h3>
        <BurndownChart snapshots={burndown.snapshots} idealLine={burndown.idealLine} totalPoints={burndown.totalPoints} phase="ACTIVE" />
      </div>

      {/* Board */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-gray-800">Sprint Board</h3>
            <ActivityFeed cohortId={cohortId} />
          </div>
          <button onClick={onMoveToReview} className="text-sm bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 transition font-medium">
            🔍 Move to Review
          </button>
        </div>
        {sprint.goal && (<p className="text-sm text-blue-700 bg-blue-50 px-3 py-2 rounded-lg mb-4">🎯 {sprint.goal}</p>)}
        {board && (
          <KanbanBoard
            board={board}
            role="MENTOR"
            userId={userId}
            onTaskMove={onTaskMove}
            onTaskBlock={onTaskBlock}
            onTaskDelete={() => {}}
          />
        )}
      </div>
    </div>
  );
}

// ── Review Phase ────────────────────────────────────────────────────
function ReviewPhase({ sprint, board, burndown, onSaveReview, onComplete }) {
  const [reviewNotes, setReviewNotes] = useState(sprint.reviewNotes || '');
  const [saving, setSaving] = useState(false);

  const allTasks = board ? Object.values(board.columns).flat() : [];
  const doneTasks = board?.columns?.DONE || [];
  const totalPoints = allTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  const completedPoints = doneTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);

  const handleSave = async () => {
    setSaving(true);
    try { await onSaveReview(reviewNotes); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-5">
      <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5">
        <p className="text-xs font-medium text-purple-600 uppercase tracking-wider mb-2">🔍 Review Phase</p>
        <p className="text-sm text-purple-800">The sprint is over. Review what was completed, write your retrospective notes, then mark the sprint as completed.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
          <p className="text-3xl font-bold text-gray-800">{doneTasks.length}</p>
          <p className="text-xs text-gray-500 mt-1">Cards Completed</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
          <p className="text-3xl font-bold text-emerald-600">{completedPoints}</p>
          <p className="text-xs text-gray-500 mt-1">Points Done</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
          <p className="text-3xl font-bold text-gray-400">{totalPoints - completedPoints}</p>
          <p className="text-xs text-gray-500 mt-1">Points Remaining</p>
        </div>
      </div>

      {/* Burndown */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-4">Final Burndown</h3>
        <BurndownChart snapshots={burndown.snapshots} idealLine={burndown.idealLine} totalPoints={burndown.totalPoints} phase="REVIEW" />
      </div>

      {/* Read-only board */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-4">Final Board State</h3>
        {board && (
          <KanbanBoard
            board={board}
            role="MENTOR"
            userId={null}
            onTaskMove={() => {}}
            onTaskBlock={() => {}}
            onTaskDelete={() => {}}
            readOnly
          />
        )}
      </div>

      {/* Review notes */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-3">Retrospective Notes</h3>
        <p className="text-xs text-gray-500 mb-3">What went well? What didn't? What will you do differently next sprint?</p>
        <textarea
          value={reviewNotes}
          onChange={(e) => setReviewNotes(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="E.g. We completed 80% of planned work. The authentication module took longer than expected (8pts → needed 13). Next sprint we'll be more conservative with estimates..."
        />
        <div className="flex gap-3 mt-3">
          <button onClick={handleSave} disabled={saving} className="text-sm bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 transition">
            {saving ? 'Saving...' : 'Save Notes'}
          </button>
          <button onClick={onComplete} className="text-sm bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition font-medium">
            ✅ Complete Sprint
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Completed Phase ─────────────────────────────────────────────────
function CompletedPhase({ sprint, board, burndown }) {
  const allTasks = board ? Object.values(board.columns).flat() : [];
  const doneTasks = board?.columns?.DONE || [];
  const totalPoints = allTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);

  return (
    <div className="space-y-5">
      {/* Velocity banner */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 text-white text-center">
        <p className="text-sm font-medium opacity-90 mb-1">Sprint Velocity</p>
        <p className="text-6xl font-black">{sprint.velocity}</p>
        <p className="text-sm opacity-80 mt-1">story points completed</p>
        {sprint.capacity > 0 && (
          <p className="text-xs opacity-70 mt-2">
            {Math.round((sprint.velocity / sprint.capacity) * 100)}% of {sprint.capacity}pt capacity achieved
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-gray-800">{doneTasks.length}/{allTasks.length}</p>
          <p className="text-xs text-gray-500 mt-1">Cards Done</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-gray-800">{sprint.velocity}/{totalPoints}</p>
          <p className="text-xs text-gray-500 mt-1">Points Done</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 text-center">
          <p className="text-2xl font-bold text-gray-800">
            {Math.ceil((new Date(sprint.endDate) - new Date(sprint.startDate)) / 86400000)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Sprint Days</p>
        </div>
      </div>

      {/* Final burndown */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-4">Burndown (Archived)</h3>
        <BurndownChart snapshots={burndown.snapshots} idealLine={burndown.idealLine} totalPoints={burndown.totalPoints} phase="COMPLETED" />
      </div>

      {/* Retrospective */}
      {sprint.reviewNotes && (
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="font-bold text-gray-800 mb-3">Retrospective Notes</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{sprint.reviewNotes}</p>
        </div>
      )}

      {/* Archived board */}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-4">Archived Board</h3>
        {board && (
          <KanbanBoard
            board={board}
            role="MENTOR"
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

// ── Main SprintBoard Page ───────────────────────────────────────────
export default function SprintBoard() {
  const user = useAuthStore((s) => s.user);
  const [cohorts, setCohorts] = useState([]);
  const [selectedCohortId, setSelectedCohortId] = useState('');
  const [sprints, setSprints] = useState([]);
  const [selectedSprintId, setSelectedSprintId] = useState('');
  const [sprint, setSprint] = useState(null);
  const [board, setBoard] = useState(null);
  const [burndown, setBurndown] = useState({ snapshots: [], idealLine: [], totalPoints: 0 });
  const [interns, setInterns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreateSprint, setShowCreateSprint] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGoal, setNewGoal] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [newCapacity, setNewCapacity] = useState('');

  useEffect(() => {
    api.get('/mentor/cohorts').then((res) => {
      const list = res.data.cohorts || [];
      setCohorts(list);
      if (list.length > 0) setSelectedCohortId(list[0].id);
    });
    api.get('/mentor/interns').then((res) => setInterns(res.data.interns || []));
  }, []);

  useEffect(() => {
    if (!selectedCohortId) return;
    api.get(`/sprint/sprints?cohortId=${selectedCohortId}`).then((res) => {
      const list = res.data.sprints || [];
      setSprints(list);
      // Auto-select active sprint first, then planning, then most recent
      const active = list.find((s) => s.phase === 'ACTIVE');
      const planning = list.find((s) => s.phase === 'PLANNING');
      const selected = active || planning || list[0];
      setSelectedSprintId(selected?.id || '');
    });
  }, [selectedCohortId]);

  const loadBoard = useCallback(async () => {
    if (!selectedSprintId) { setBoard(null); setSprint(null); return; }
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
    if (!selectedCohortId) return;
    socket.emit('join:cohort', selectedCohortId);

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
      // Refresh burndown after move
      setTimeout(() => {
        api.get(`/sprint/sprints/${selectedSprintId}/burndown`).then((res) => {
          setBurndown({ snapshots: res.data.snapshots || [], idealLine: res.data.idealLine || [], totalPoints: res.data.totalPoints || 0 });
        });
      }, 500);
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
      loadBoard();
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
  }, [selectedCohortId, selectedSprintId]);

  const handleCreateSprint = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await api.post('/sprint/sprints', {
        cohortId: selectedCohortId, name: newName,
        goal: newGoal || undefined, startDate: newStart, endDate: newEnd,
        capacity: newCapacity ? parseInt(newCapacity) : undefined,
      });
      const created = res.data.sprint;
      setSprints((prev) => [created, ...prev]);
      setSelectedSprintId(created.id);
      setNewName(''); setNewGoal(''); setNewStart(''); setNewEnd(''); setNewCapacity('');
      setShowCreateSprint(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create sprint');
    } finally {
      setCreating(false);
    }
  };

  const handlePhaseTransition = async (nextPhase) => {
    const confirmMessages = {
      ACTIVE: 'Start this sprint? Interns will be able to see and interact with the board.',
      REVIEW: 'Move sprint to Review? The board will become read-only for changes.',
      COMPLETED: 'Complete this sprint? Velocity will be calculated. This cannot be undone.',
    };
    if (!window.confirm(confirmMessages[nextPhase])) return;
    try {
      await api.patch(`/sprint/sprints/${selectedSprintId}/phase`, { phase: nextPhase });
      await loadBoard();
      // Refresh sprint list to update phase badges
      const listRes = await api.get(`/sprint/sprints?cohortId=${selectedCohortId}`);
      setSprints(listRes.data.sprints || []);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update sprint phase');
    }
  };

  const handleAddTask = async (data) => {
    await api.post(`/sprint/sprints/${selectedSprintId}/tasks`, data);
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this card?')) return;
    try { await api.delete(`/sprint/tasks/${taskId}`); }
    catch (err) { alert(err.response?.data?.error || 'Failed to delete'); }
  };

  const handleUpdatePoints = async (taskId, storyPoints) => {
    try { await api.patch(`/sprint/tasks/${taskId}/points`, { storyPoints }); }
    catch (err) { alert(err.response?.data?.error || 'Failed to update points'); }
  };

  const handleUpdateCapacity = async (capacity) => {
    try { await api.patch(`/sprint/sprints/${selectedSprintId}/capacity`, { capacity }); }
    catch (err) { console.error('Failed to update capacity'); }
  };

  const handleTaskMove = async (taskId, newStatus) => {
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
      alert(err.response?.data?.error || 'Failed to move card');
      loadBoard();
    }
  };

  const handleTaskBlock = async (taskId) => {
    try { await api.patch(`/sprint/tasks/${taskId}/block`); }
    catch (err) { alert(err.response?.data?.error || 'Failed to update card'); }
  };

  const handleSaveReview = async (reviewNotes) => {
    await api.patch(`/sprint/sprints/${selectedSprintId}/review`, { reviewNotes });
  };

  const fmtDate = (s) => s ? new Date(s).toLocaleDateString([], { dateStyle: 'medium' }) : '';
  const phase = sprint?.phase;
  const phaseConfig = phase ? PHASE_CONFIG[phase] : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Sprint Board</h2>
          <p className="text-sm text-gray-500 mt-0.5">Full Agile Sprint lifecycle — Plan → Execute → Review → Complete</p>
        </div>
        <button onClick={() => setShowCreateSprint(!showCreateSprint)} className="text-sm bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 transition font-medium">
          {showCreateSprint ? 'Cancel' : '+ New Sprint'}
        </button>
      </div>
      
      <HowToUse />
      {/* Create sprint form */}
      {showCreateSprint && (
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="font-bold text-gray-800 mb-4">Create a new sprint</h3>
          <form onSubmit={handleCreateSprint} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Cohort</label>
                <select value={selectedCohortId} onChange={(e) => setSelectedCohortId(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                  {cohorts.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Sprint name</label>
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} required className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Sprint 1" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Start date</label>
                <input type="date" value={newStart} onChange={(e) => setNewStart(e.target.value)} required className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">End date</label>
                <input type="date" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} required className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Capacity (story points)</label>
                <input type="number" value={newCapacity} onChange={(e) => setNewCapacity(e.target.value)} min={0} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="e.g. 40" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Sprint goal (optional)</label>
                <input type="text" value={newGoal} onChange={(e) => setNewGoal(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Complete auth module" />
              </div>
            </div>
            <button type="submit" disabled={creating} className="bg-purple-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition">
              {creating ? 'Creating...' : 'Create Sprint'}
            </button>
          </form>
        </div>
      )}

      {/* Sprint selector */}
      {sprints.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-sm font-medium text-gray-700 shrink-0">Sprint:</label>
          <div className="flex gap-2 flex-wrap">
            {sprints.map((s) => (
              <button key={s.id} onClick={() => setSelectedSprintId(s.id)} className={`text-sm px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${selectedSprintId === s.id ? 'bg-purple-600 text-white' : 'bg-white border border-gray-300 text-gray-700 hover:border-purple-400'}`}>
                {PHASE_CONFIG[s.phase]?.icon} {s.name}
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${selectedSprintId === s.id ? 'bg-purple-500' : 'bg-gray-100 text-gray-500'}`}>{s.phase}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sprint info strip */}
      {sprint && (
        <div className="bg-white rounded-2xl shadow-sm px-5 py-3 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${phaseConfig?.color}`}>{phaseConfig?.icon} {phase}</span>
            <span className="text-sm text-gray-600">{sprint.name}</span>
            <span className="text-xs text-gray-400">{fmtDate(sprint.startDate)} → {fmtDate(sprint.endDate)}</span>
            {sprint.capacity > 0 && (<span className="text-xs text-gray-400">Capacity: {sprint.capacity}pts</span>)}
          </div>
          {phaseConfig?.next && (
            <button onClick={() => handlePhaseTransition(phaseConfig.next)} className={`text-xs text-white px-3 py-1.5 rounded-lg transition font-medium ${phaseConfig.nextColor}`}>
              {phaseConfig.nextLabel}
            </button>
          )}
        </div>
      )}

      {/* Phase views */}
      {loading ? (
        <div className="bg-white rounded-2xl p-8 text-center text-gray-500">Loading...</div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700">{error}</div>
      ) : !sprint ? (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-500">
          {sprints.length === 0 ? 'No sprints yet. Create one above to get started.' : 'Select a sprint above.'}
        </div>
      ) : phase === 'PLANNING' ? (
        <PlanningPhase
          sprint={sprint}
          board={board}
          interns={interns}
          onAddTask={handleAddTask}
          onDeleteTask={handleDeleteTask}
          onUpdatePoints={handleUpdatePoints}
          onUpdateCapacity={handleUpdateCapacity}
          onStartSprint={() => handlePhaseTransition('ACTIVE')}
        />
      ) : phase === 'ACTIVE' ? (
        <ActivePhase
          sprint={sprint}
          board={board}
          burndown={burndown}
          interns={interns}
          userId={user?.id}
          onTaskMove={handleTaskMove}
          onTaskBlock={handleTaskBlock}
          onMoveToReview={() => handlePhaseTransition('REVIEW')}
          cohortId={selectedCohortId}
        />
      ) : phase === 'REVIEW' ? (
        <ReviewPhase
          sprint={sprint}
          board={board}
          burndown={burndown}
          onSaveReview={handleSaveReview}
          onComplete={() => handlePhaseTransition('COMPLETED')}
        />
      ) : phase === 'COMPLETED' ? (
        <CompletedPhase sprint={sprint} board={board} burndown={burndown} />
      ) : null}
    </div>
  );
}