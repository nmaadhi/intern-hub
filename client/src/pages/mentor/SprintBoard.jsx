import { useEffect, useState, useCallback } from 'react';
import api from '../../lib/api';
import useAuthStore from '../../store/authStore';
import KanbanBoard from '../../components/KanbanBoard';
import BurndownChart from '../../components/BurndownChart';
import ActivityFeed from '../../components/ActivityFeed';
import { socket } from '../../lib/socket';

const STORY_POINTS = [0, 1, 2, 3, 5, 8, 13];

const LANGUAGES = [
  { value: 'python', label: 'Python' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'c', label: 'C' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'ruby', label: 'Ruby' },
];

const PHASE_CONFIG = {
  PLANNING: { label: 'Planning', color: 'bg-amber-100 text-amber-700', icon: '📋', next: 'ACTIVE', nextLabel: '🚀 Start Sprint', nextColor: 'bg-blue-600 hover:bg-blue-700' },
  ACTIVE: { label: 'Active', color: 'bg-blue-100 text-blue-700', icon: '🏃', next: 'REVIEW', nextLabel: '🔍 Move to Review', nextColor: 'bg-purple-600 hover:bg-purple-700' },
  REVIEW: { label: 'Review', color: 'bg-purple-100 text-purple-700', icon: '🔍', next: 'COMPLETED', nextLabel: '✅ Complete Sprint', nextColor: 'bg-emerald-600 hover:bg-emerald-700' },
  COMPLETED: { label: 'Completed', color: 'bg-emerald-100 text-emerald-700', icon: '✅', next: null, nextLabel: null },
};

// ── Add Card Form ─────────────────────────────────────────────────
function AddCardForm({ interns, onAdd, onCancel }) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [assignee, setAssignee] = useState('');
  const [points, setPoints] = useState(0);
  const [isCodeTask, setIsCodeTask] = useState(false);
  const [codeLanguage, setCodeLanguage] = useState('python');
  const [adding, setAdding] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAdding(true);
    try {
      await onAdd({
        title, description: desc || undefined,
        assignedToId: assignee || undefined,
        storyPoints: points, isCodeTask,
        codeLanguage: isCodeTask ? codeLanguage : undefined,
      });
      setTitle(''); setDesc(''); setAssignee(''); setPoints(0);
      setIsCodeTask(false); setCodeLanguage('python');
      onCancel();
    } finally {
      setAdding(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">Card Title *</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
          required autoFocus
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
          placeholder="e.g. Implement login function" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          Description {isCodeTask && <span className="text-purple-600">(⭐ Write requirements — AI uses this to evaluate code)</span>}
        </label>
        <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={isCodeTask ? 3 : 2}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white resize-none"
          placeholder={isCodeTask ? 'e.g. Write a Python function that adds two numbers and prints the result.' : 'Any extra context...'} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Assign to</label>
          <select value={assignee} onChange={(e) => setAssignee(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white">
            <option value="">Unassigned</option>
            {interns.map((i) => (<option key={i.id} value={i.id}>{i.name} ({i.internId})</option>))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Story Points</label>
          <div className="flex gap-1 flex-wrap">
            {STORY_POINTS.map((p) => (
              <button key={p} type="button" onClick={() => setPoints(p)}
                className={`text-xs px-2 py-1 rounded-lg font-bold transition ${points === p ? 'bg-purple-600 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:border-purple-400'}`}>
                {p === 0 ? '?' : p}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-100 rounded-xl">
        <input type="checkbox" id="isCodeTask" checked={isCodeTask}
          onChange={(e) => setIsCodeTask(e.target.checked)}
          className="accent-purple-600 w-4 h-4 cursor-pointer" />
        <label htmlFor="isCodeTask" className="text-sm font-medium text-purple-800 cursor-pointer">
          💻 Code Task — intern must write and submit code for AI review
        </label>
      </div>

      {isCodeTask && (
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Programming Language</label>
          <select value={codeLanguage} onChange={(e) => setCodeLanguage(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white">
            {LANGUAGES.map((l) => (<option key={l.value} value={l.value}>{l.label}</option>))}
          </select>
        </div>
      )}

      <div className="flex gap-2">
        <button type="submit" disabled={adding}
          className="bg-purple-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition font-medium">
          {adding ? 'Adding...' : 'Add Card'}
        </button>
        <button type="button" onClick={onCancel}
          className="text-sm px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition">
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Edit Card Modal ───────────────────────────────────────────────
function EditCardModal({ task, interns, onSave, onClose }) {
  const [title, setTitle] = useState(task.title);
  const [desc, setDesc] = useState(task.description || '');
  const [assignee, setAssignee] = useState(task.assignedToId || '');
  const [points, setPoints] = useState(task.storyPoints || 0);
  const [isCodeTask, setIsCodeTask] = useState(task.isCodeTask || false);
  const [codeLanguage, setCodeLanguage] = useState(task.codeLanguage || 'python');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(task.id, {
        title, description: desc || undefined,
        assignedToId: assignee || null,
        storyPoints: points, isCodeTask,
        codeLanguage: isCodeTask ? codeLanguage : null,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h3 className="font-bold text-gray-800">Edit Card</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Title *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Description {isCodeTask && <span className="text-purple-600">(AI uses this to evaluate code)</span>}
            </label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={isCodeTask ? 3 : 2}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
              placeholder={isCodeTask ? 'e.g. Write a function that adds two numbers.' : 'Optional description...'} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Assign to</label>
            <select value={assignee} onChange={(e) => setAssignee(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
              <option value="">Unassigned</option>
              {interns.map((i) => (<option key={i.id} value={i.id}>{i.name} ({i.internId})</option>))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Story Points</label>
            <div className="flex gap-1.5 flex-wrap">
              {STORY_POINTS.map((p) => (
                <button key={p} type="button" onClick={() => setPoints(p)}
                  className={`text-sm px-3 py-1.5 rounded-lg font-bold transition ${points === p ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                  {p === 0 ? '?' : p}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-purple-50 border border-purple-100 rounded-xl">
            <input type="checkbox" id="editIsCodeTask" checked={isCodeTask}
              onChange={(e) => setIsCodeTask(e.target.checked)}
              className="accent-purple-600 w-4 h-4 cursor-pointer" />
            <label htmlFor="editIsCodeTask" className="text-sm font-medium text-purple-800 cursor-pointer">
              💻 Code Task
            </label>
          </div>
          {isCodeTask && (
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Programming Language</label>
              <select value={codeLanguage} onChange={(e) => setCodeLanguage(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                {LANGUAGES.map((l) => (<option key={l.value} value={l.value}>{l.label}</option>))}
              </select>
            </div>
          )}
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 sticky bottom-0 bg-white">
          <button onClick={handleSave} disabled={saving || !title.trim()}
            className="flex-1 bg-purple-600 text-white py-2.5 rounded-xl hover:bg-purple-700 disabled:opacity-50 transition font-medium text-sm">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          <button onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 transition text-sm">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── HowToUse ──────────────────────────────────────────────────────
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
              <li>→ Set sprint capacity</li>
              <li>→ Add cards, set story points</li>
              <li>→ Toggle 💻 Code Task for coding challenges</li>
              <li>→ Write clear description — AI uses it to evaluate</li>
              <li>→ Click 🚀 Start Sprint when ready</li>
            </ul>
          </div>
          <div>
            <p className="font-bold text-blue-600 mb-2">🏃 ACTIVE Phase</p>
            <ul className="space-y-1 text-gray-600 text-xs">
              <li>→ Add/edit cards anytime</li>
              <li>→ 💻 Code tasks: intern writes code → AI reviews → auto DONE</li>
              <li>→ Block cards if intern is stuck</li>
              <li>→ Click 🗑 Cancel Sprint to delete it</li>
            </ul>
          </div>
          <div>
            <p className="font-bold text-purple-600 mb-2">💡 How AI evaluates code</p>
            <ul className="space-y-1 text-gray-600 text-xs">
              <li>→ Reads card title + description as requirements</li>
              <li>→ Runs code via Piston API</li>
              <li>→ PASSED → auto moves to Done ✅</li>
              <li>→ FAILED → intern fixes and resubmits</li>
            </ul>
          </div>
          <div>
            <p className="font-bold text-emerald-600 mb-2">✅ COMPLETED Phase</p>
            <ul className="space-y-1 text-gray-600 text-xs">
              <li>→ Velocity = total points completed</li>
              <li>→ Cannot delete completed sprints</li>
              <li>→ Everything archived</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Planning Phase ────────────────────────────────────────────────
function PlanningPhase({ sprint, interns, onAddTask, onDeleteTask, onUpdatePoints, onUpdateCapacity, onStartSprint, onEditTask, board }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const allTasks = board ? Object.values(board.columns).flat() : [];
  const totalPlanned = allTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  const overCapacity = sprint.capacity > 0 && totalPlanned > sprint.capacity;
  const capacityPct = sprint.capacity > 0 ? Math.min(100, Math.round((totalPlanned / sprint.capacity) * 100)) : 0;

  return (
    <div className="space-y-5">
      {editingTask && (
        <EditCardModal task={editingTask} interns={interns} onSave={onEditTask} onClose={() => setEditingTask(null)} />
      )}

      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">📋 Planning Phase</p>
            <p className="text-sm text-amber-800">Add cards and set story points before starting the sprint.</p>
          </div>
          <button onClick={onStartSprint} disabled={allTasks.length === 0}
            className="shrink-0 bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition text-sm font-bold shadow-sm">
            🚀 Start Sprint
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-800">Capacity Planning</h3>
          <input type="number" defaultValue={sprint.capacity || ''}
            onBlur={(e) => onUpdateCapacity(parseInt(e.target.value) || 0)}
            placeholder="Set capacity (pts)" min={0}
            className="w-36 text-sm px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
        </div>
        <div className="flex items-center gap-3 text-sm mb-2">
          <span className={`font-semibold ${overCapacity ? 'text-red-600' : 'text-gray-700'}`}>{totalPlanned} pts planned</span>
          {sprint.capacity > 0 && <span className="text-gray-400">/ {sprint.capacity} pts capacity</span>}
        </div>
        {sprint.capacity > 0 && (
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div className={`h-3 rounded-full transition-all ${overCapacity ? 'bg-red-500' : 'bg-purple-500'}`} style={{ width: `${capacityPct}%` }} />
          </div>
        )}
        {overCapacity && <p className="text-xs text-red-600 mt-1">Over capacity by {totalPlanned - sprint.capacity} pts</p>}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-800">Backlog <span className="text-gray-400 font-normal">({allTasks.length} cards)</span></h3>
          <button onClick={() => setShowAddForm(!showAddForm)}
            className={`text-sm px-4 py-2 rounded-xl font-medium transition ${showAddForm ? 'bg-gray-200 text-gray-700' : 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm'}`}>
            {showAddForm ? 'Cancel' : '+ Add Card'}
          </button>
        </div>

        {showAddForm && (
          <div className="mb-4">
            <AddCardForm interns={interns} onAdd={onAddTask} onCancel={() => setShowAddForm(false)} />
          </div>
        )}

        {allTasks.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p className="text-3xl mb-2">📋</p>
            <p className="text-sm">No cards yet. Add some to plan the sprint.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {allTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition group">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {task.isCodeTask && (
                      <span className="text-xs bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded font-medium shrink-0">
                        💻 {task.codeLanguage}
                      </span>
                    )}
                    <p className="text-sm font-medium text-gray-800 truncate">{task.title}</p>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {task.assignedTo ? task.assignedTo.name : 'Unassigned'}
                    {task.description && ` · ${task.description}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex gap-1">
                    {STORY_POINTS.map((p) => (
                      <button key={p} onClick={() => onUpdatePoints(task.id, p)}
                        className={`text-xs px-1.5 py-0.5 rounded font-bold transition ${(task.storyPoints || 0) === p ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}>
                        {p === 0 ? '?' : p}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => setEditingTask(task)}
                    className="text-xs text-blue-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition px-1">✏️</button>
                  <button onClick={() => onDeleteTask(task.id)}
                    className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition px-1">✕</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Active Phase ──────────────────────────────────────────────────
function ActivePhase({ sprint, board, burndown, interns, userId, onTaskMove, onTaskBlock, onMoveToReview, cohortId, onAddTask, onEditTask }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const daysRemaining = Math.max(0, Math.ceil((new Date(sprint.endDate) - new Date()) / 86400000));

  return (
    <div className="space-y-5">
      {editingTask && (
        <EditCardModal task={editingTask} interns={interns} onSave={onEditTask} onClose={() => setEditingTask(null)} />
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Days Left', value: daysRemaining, color: 'border-blue-500', textColor: daysRemaining <= 2 ? 'text-red-600' : 'text-gray-800' },
          { label: 'Points Done', value: board?.stats?.completedPoints || 0, color: 'border-purple-500', textColor: 'text-gray-800' },
          { label: 'Remaining', value: board?.stats?.remainingPoints || 0, color: 'border-amber-500', textColor: 'text-gray-800' },
          { label: 'Progress', value: `${board?.stats?.progressPct || 0}%`, color: 'border-emerald-500', textColor: 'text-gray-800' },
        ].map((s) => (
          <div key={s.label} className={`bg-white rounded-2xl shadow-sm p-4 border-l-4 ${s.color}`}>
            <p className="text-xs text-gray-500 uppercase font-medium tracking-wide">{s.label}</p>
            <p className={`text-3xl font-bold mt-1 ${s.textColor}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-4">Burndown Chart</h3>
        <BurndownChart snapshots={burndown.snapshots} idealLine={burndown.idealLine} totalPoints={burndown.totalPoints} phase="ACTIVE" />
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-gray-800">Sprint Board</h3>
            <ActivityFeed cohortId={cohortId} />
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowAddForm(!showAddForm)}
              className={`text-sm px-3 py-1.5 rounded-lg font-medium transition ${showAddForm ? 'bg-gray-200 text-gray-700' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}>
              {showAddForm ? 'Cancel' : '+ Add Card'}
            </button>
            <button onClick={onMoveToReview} className="text-sm bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 transition font-medium">
              🔍 Move to Review
            </button>
          </div>
        </div>

        {showAddForm && (
          <div className="mb-5">
            <AddCardForm interns={interns} onAdd={async (data) => { await onAddTask(data); setShowAddForm(false); }} onCancel={() => setShowAddForm(false)} />
          </div>
        )}

        {sprint.goal && (
          <p className="text-sm text-blue-700 bg-blue-50 px-3 py-2 rounded-lg mb-4">🎯 {sprint.goal}</p>
        )}

        <p className="text-xs text-gray-400 mb-3">💡 Click ✏️ Edit on any card · 💻 = Code Task</p>

        {board && (
          <KanbanBoard
            board={board} role="MENTOR" userId={userId}
            onTaskMove={onTaskMove} onTaskBlock={onTaskBlock}
            onTaskDelete={() => {}} onTaskEdit={(task) => setEditingTask(task)}
          />
        )}
      </div>
    </div>
  );
}

// ── Review Phase ──────────────────────────────────────────────────
function ReviewPhase({ sprint, board, burndown, onSaveReview, onComplete }) {
  const [reviewNotes, setReviewNotes] = useState(sprint.reviewNotes || '');
  const [saving, setSaving] = useState(false);
  const allTasks = board ? Object.values(board.columns).flat() : [];
  const doneTasks = board?.columns?.DONE || [];
  const totalPoints = allTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  const completedPoints = doneTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-2xl p-5">
        <p className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-1">🔍 Review Phase</p>
        <p className="text-sm text-purple-800">Sprint over. Write retrospective notes and complete the sprint.</p>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Cards Done', value: `${doneTasks.length}/${allTasks.length}`, color: 'border-purple-500' },
          { label: 'Points Done', value: completedPoints, color: 'border-emerald-500', textColor: 'text-emerald-600' },
          { label: 'Remaining', value: totalPoints - completedPoints, color: 'border-gray-300', textColor: 'text-gray-400' },
        ].map((s) => (
          <div key={s.label} className={`bg-white rounded-2xl shadow-sm p-4 text-center border-l-4 ${s.color}`}>
            <p className={`text-2xl font-bold ${s.textColor || 'text-gray-800'}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-4">Final Burndown</h3>
        <BurndownChart snapshots={burndown.snapshots} idealLine={burndown.idealLine} totalPoints={burndown.totalPoints} phase="REVIEW" />
      </div>
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-4">Final Board State</h3>
        {board && <KanbanBoard board={board} role="MENTOR" userId={null} onTaskMove={() => {}} onTaskBlock={() => {}} onTaskDelete={() => {}} readOnly />}
      </div>
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-1">Retrospective Notes</h3>
        <p className="text-xs text-gray-500 mb-3">What went well? What needs improvement?</p>
        <textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          placeholder="E.g. We completed 80% of planned work..." />
        <div className="flex gap-3 mt-3">
          <button onClick={async () => { setSaving(true); try { await onSaveReview(reviewNotes); } finally { setSaving(false); } }}
            disabled={saving}
            className="text-sm bg-gray-700 text-white px-4 py-2 rounded-xl hover:bg-gray-800 disabled:opacity-50 transition font-medium">
            {saving ? 'Saving...' : 'Save Notes'}
          </button>
          <button onClick={onComplete} className="text-sm bg-emerald-600 text-white px-4 py-2 rounded-xl hover:bg-emerald-700 transition font-medium">
            ✅ Complete Sprint
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Completed Phase ───────────────────────────────────────────────
function CompletedPhase({ sprint, board, burndown }) {
  const allTasks = board ? Object.values(board.columns).flat() : [];
  const doneTasks = board?.columns?.DONE || [];
  const totalPoints = allTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 text-white text-center">
        <p className="text-sm font-medium opacity-90 mb-1">🏆 Sprint Velocity</p>
        <p className="text-6xl font-black">{sprint.velocity}</p>
        <p className="text-sm opacity-80 mt-1">story points completed</p>
        {sprint.capacity > 0 && (
          <p className="text-xs opacity-70 mt-2">{Math.round((sprint.velocity / sprint.capacity) * 100)}% of {sprint.capacity}pt capacity</p>
        )}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Cards Done', value: `${doneTasks.length}/${allTasks.length}` },
          { label: 'Points Done', value: `${sprint.velocity}/${totalPoints}` },
          { label: 'Sprint Days', value: Math.ceil((new Date(sprint.endDate) - new Date(sprint.startDate)) / 86400000) },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-gray-800">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-4">Burndown (Archived)</h3>
        <BurndownChart snapshots={burndown.snapshots} idealLine={burndown.idealLine} totalPoints={burndown.totalPoints} phase="COMPLETED" />
      </div>
      {sprint.reviewNotes && (
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="font-bold text-gray-800 mb-3">Retrospective Notes</h3>
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{sprint.reviewNotes}</p>
        </div>
      )}
      <div className="bg-white rounded-2xl shadow-sm p-5">
        <h3 className="font-bold text-gray-800 mb-4">Archived Board</h3>
        {board && <KanbanBoard board={board} role="MENTOR" userId={null} onTaskMove={() => {}} onTaskBlock={() => {}} onTaskDelete={() => {}} readOnly />}
      </div>
    </div>
  );
}

// ── Main SprintBoard ──────────────────────────────────────────────
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

  useEffect(() => {
    if (!selectedCohortId) return;
    socket.emit('join:cohort', selectedCohortId);

    const onTaskMoved = ({ taskId, newStatus, task }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        const newCols = { ...prev.columns };
        for (const col of Object.keys(newCols)) newCols[col] = newCols[col].filter((t) => t.id !== taskId);
        newCols[newStatus] = [...(newCols[newStatus] || []), task];
        return { ...prev, columns: newCols };
      });
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
        for (const col of Object.keys(newCols)) newCols[col] = newCols[col].filter((t) => t.id !== taskId);
        return { ...prev, columns: newCols };
      });
    };

    const onTaskBlocked = ({ taskId, blocked }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        const newCols = { ...prev.columns };
        for (const col of Object.keys(newCols)) newCols[col] = newCols[col].map((t) => t.id === taskId ? { ...t, blocked } : t);
        return { ...prev, columns: newCols };
      });
    };

    const onTaskEdited = ({ task }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        const newCols = { ...prev.columns };
        for (const col of Object.keys(newCols)) newCols[col] = newCols[col].map((t) => t.id === task.id ? { ...t, ...task } : t);
        return { ...prev, columns: newCols };
      });
    };

    const onTaskPointsUpdated = ({ taskId, storyPoints }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        const newCols = { ...prev.columns };
        for (const col of Object.keys(newCols)) newCols[col] = newCols[col].map((t) => t.id === taskId ? { ...t, storyPoints } : t);
        return { ...prev, columns: newCols };
      });
    };

    const onPhaseChanged = ({ phase, velocity }) => {
      setSprint((prev) => prev ? { ...prev, phase, velocity } : prev);
      loadBoard();
    };

    const onSprintDeleted = ({ sprintId }) => {
      setSprints((prev) => prev.filter((s) => s.id !== sprintId));
      if (selectedSprintId === sprintId) {
        setSelectedSprintId('');
        setSprint(null);
        setBoard(null);
      }
    };

    socket.on('task:moved', onTaskMoved);
    socket.on('task:created', onTaskCreated);
    socket.on('task:deleted', onTaskDeleted);
    socket.on('task:blocked', onTaskBlocked);
    socket.on('task:edited', onTaskEdited);
    socket.on('task:points_updated', onTaskPointsUpdated);
    socket.on('sprint:phase_changed', onPhaseChanged);
    socket.on('sprint:deleted', onSprintDeleted);

    return () => {
      socket.off('task:moved', onTaskMoved);
      socket.off('task:created', onTaskCreated);
      socket.off('task:deleted', onTaskDeleted);
      socket.off('task:blocked', onTaskBlocked);
      socket.off('task:edited', onTaskEdited);
      socket.off('task:points_updated', onTaskPointsUpdated);
      socket.off('sprint:phase_changed', onPhaseChanged);
      socket.off('sprint:deleted', onSprintDeleted);
    };
  }, [selectedCohortId, selectedSprintId, loadBoard]);

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
    const msgs = {
      ACTIVE: 'Start this sprint? Interns will see the board.',
      REVIEW: 'Move to Review? Board becomes read-only.',
      COMPLETED: 'Complete this sprint? This cannot be undone.',
    };
    if (!window.confirm(msgs[nextPhase])) return;
    try {
      await api.patch(`/sprint/sprints/${selectedSprintId}/phase`, { phase: nextPhase });
      await loadBoard();
      const listRes = await api.get(`/sprint/sprints?cohortId=${selectedCohortId}`);
      setSprints(listRes.data.sprints || []);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update phase');
    }
  };

  const handleDeleteSprint = async () => {
    if (!window.confirm(`Delete sprint "${sprint.name}"? This will remove all cards and data. This cannot be undone.`)) return;
    try {
      await api.delete(`/sprint/sprints/${selectedSprintId}`);
      setSprints((prev) => prev.filter((s) => s.id !== selectedSprintId));
      setSelectedSprintId('');
      setSprint(null);
      setBoard(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete sprint');
    }
  };

  const handleAddTask = async (data) => { await api.post(`/sprint/sprints/${selectedSprintId}/tasks`, data); };

  const handleEditTask = async (taskId, data) => {
    try { await api.patch(`/sprint/tasks/${taskId}/edit`, data); }
    catch (err) { alert(err.response?.data?.error || 'Failed to edit card'); }
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
    try { await api.patch(`/sprint/tasks/${taskId}/move`, { status: newStatus }); }
    catch (err) { alert(err.response?.data?.error || 'Failed to move card'); loadBoard(); }
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Sprint Board</h2>
          <p className="text-sm text-gray-500 mt-0.5">Plan → Execute → Review → Complete</p>
        </div>
        <button onClick={() => setShowCreateSprint(!showCreateSprint)}
          className="text-sm bg-purple-600 text-white px-4 py-2 rounded-xl hover:bg-purple-700 transition font-medium shadow-sm">
          {showCreateSprint ? 'Cancel' : '+ New Sprint'}
        </button>
      </div>

      <HowToUse />

      {showCreateSprint && (
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h3 className="font-bold text-gray-800 mb-4">Create a new sprint</h3>
          <form onSubmit={handleCreateSprint} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Cohort</label>
                <select value={selectedCohortId} onChange={(e) => setSelectedCohortId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                  {cohorts.map((c) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Sprint name</label>
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} required
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Sprint 1" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Start date</label>
                <input type="date" value={newStart} onChange={(e) => setNewStart(e.target.value)} required
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">End date</label>
                <input type="date" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} required
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Capacity (pts)</label>
                <input type="number" value={newCapacity} onChange={(e) => setNewCapacity(e.target.value)} min={0}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="e.g. 40" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Sprint goal (optional)</label>
                <input type="text" value={newGoal} onChange={(e) => setNewGoal(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Complete auth module" />
              </div>
            </div>
            <button type="submit" disabled={creating}
              className="bg-purple-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-purple-700 disabled:opacity-50 transition font-medium">
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
              <button key={s.id} onClick={() => setSelectedSprintId(s.id)}
                className={`text-sm px-3 py-1.5 rounded-xl font-medium transition flex items-center gap-1.5 ${selectedSprintId === s.id ? 'bg-purple-600 text-white shadow-sm' : 'bg-white border border-gray-300 text-gray-700 hover:border-purple-400'}`}>
                {PHASE_CONFIG[s.phase]?.icon} {s.name}
                <span className={`text-xs px-1.5 py-0.5 rounded-lg font-medium ${selectedSprintId === s.id ? 'bg-purple-500' : 'bg-gray-100 text-gray-500'}`}>
                  {s.phase}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sprint info strip */}
      {sprint && (
        <div className="bg-white rounded-2xl shadow-sm px-5 py-3 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${phaseConfig?.color}`}>
              {phaseConfig?.icon} {phase}
            </span>
            <span className="text-sm font-medium text-gray-700">{sprint.name}</span>
            <span className="text-xs text-gray-400">{fmtDate(sprint.startDate)} → {fmtDate(sprint.endDate)}</span>
            {sprint.capacity > 0 && <span className="text-xs text-gray-400">Capacity: {sprint.capacity}pts</span>}
          </div>
          <div className="flex items-center gap-2">
            {phaseConfig?.next && (
              <button onClick={() => handlePhaseTransition(phaseConfig.next)}
                className={`text-xs text-white px-3 py-1.5 rounded-lg transition font-bold ${phaseConfig.nextColor}`}>
                {phaseConfig.nextLabel}
              </button>
            )}
            {phase !== 'COMPLETED' && (
              <button onClick={handleDeleteSprint}
                className="text-xs bg-red-100 text-red-600 hover:bg-red-200 px-3 py-1.5 rounded-lg transition font-medium">
                🗑 Cancel Sprint
              </button>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="bg-white rounded-2xl p-8 text-center text-gray-500">Loading...</div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700">{error}</div>
      ) : !sprint ? (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-gray-500">
          {sprints.length === 0 ? 'No sprints yet. Create one above.' : 'Select a sprint above.'}
        </div>
      ) : phase === 'PLANNING' ? (
        <PlanningPhase sprint={sprint} board={board} interns={interns}
          onAddTask={handleAddTask} onDeleteTask={handleDeleteTask}
          onUpdatePoints={handleUpdatePoints} onUpdateCapacity={handleUpdateCapacity}
          onStartSprint={() => handlePhaseTransition('ACTIVE')} onEditTask={handleEditTask} />
      ) : phase === 'ACTIVE' ? (
        <ActivePhase sprint={sprint} board={board} burndown={burndown} interns={interns}
          userId={user?.id} onTaskMove={handleTaskMove} onTaskBlock={handleTaskBlock}
          onMoveToReview={() => handlePhaseTransition('REVIEW')}
          cohortId={selectedCohortId} onAddTask={handleAddTask} onEditTask={handleEditTask} />
      ) : phase === 'REVIEW' ? (
        <ReviewPhase sprint={sprint} board={board} burndown={burndown}
          onSaveReview={handleSaveReview} onComplete={() => handlePhaseTransition('COMPLETED')} />
      ) : phase === 'COMPLETED' ? (
        <CompletedPhase sprint={sprint} board={board} burndown={burndown} />
      ) : null}
    </div>
  );
}