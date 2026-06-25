import { useState } from 'react';
import {
  DndContext, DragOverlay, useDroppable, useDraggable,
  closestCorners, MouseSensor, TouchSensor, useSensor, useSensors,
} from '@dnd-kit/core';

const COLUMNS = [
  { id: 'TODO', label: 'To Do', color: 'border-gray-300', bg: 'bg-gray-50' },
  { id: 'IN_PROGRESS', label: 'In Progress', color: 'border-blue-400', bg: 'bg-blue-50' },
  { id: 'REVIEW', label: 'Review', color: 'border-amber-400', bg: 'bg-amber-50' },
  { id: 'DONE', label: 'Done', color: 'border-emerald-400', bg: 'bg-emerald-50' },
];

function StoryPointsBadge({ points }) {
  if (points === undefined || points === null) return null;
  return (
    <span className="shrink-0 text-xs font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">
      {points}pts
    </span>
  );
}

function KanbanCard({
  task, role, userId, onBlock, onDelete, onEdit,
  onWriteCode, onApprove, onReject,
  overlay = false, readOnly = false,
}) {
  const canDrag = !readOnly && !task.blocked && role !== 'INTERN';

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
    disabled: !canDrag,
  });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  const isMyTask = task.assignedToId === userId;
  const isCodeTask = task.isCodeTask;
  const aiPassed = task.codeSubmissions?.[0]?.passed;

  // ✅ Write Code only shows for intern when IN_PROGRESS
  const showWriteCode = role === 'INTERN' && !overlay && !readOnly
    && isMyTask && isCodeTask && task.status === 'IN_PROGRESS';

  // ✅ Approve/Reject only shows for mentor on code tasks in REVIEW
  const showApproveReject = role === 'MENTOR' && !overlay && !readOnly
    && isCodeTask && task.status === 'REVIEW';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-xl shadow-sm border transition
        ${task.blocked ? 'border-red-300 bg-red-50' : isCodeTask ? 'border-purple-200' : 'border-gray-200'}
        ${isDragging && !overlay ? 'opacity-40' : ''}
        ${overlay ? 'shadow-xl rotate-1' : ''}
      `}
    >
      {/* Drag handle + content */}
      <div
        {...(canDrag ? listeners : {})}
        {...(canDrag ? attributes : {})}
        className={`p-3 ${canDrag && !overlay ? 'cursor-grab active:cursor-grabbing' : ''}`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {isCodeTask && (
              <span className="inline-block text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-medium mb-1">
                💻 {task.codeLanguage || 'code'}
              </span>
            )}
            <p className="text-sm font-medium text-gray-800 leading-tight">{task.title}</p>
            {task.description && (
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>
            )}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {task.assignedTo && (
                <span className="text-xs text-purple-600 font-medium">{task.assignedTo.name}</span>
              )}
              {task.blocked && (
                <span className="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-medium">🚫 Blocked</span>
              )}
              {/* ✅ Show AI Approved badge when in REVIEW */}
              {isCodeTask && task.status === 'REVIEW' && aiPassed && (
                <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                  ⏳ AI Approved — Awaiting mentor
                </span>
              )}
              {isCodeTask && task.status === 'DONE' && (
                <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-medium">
                  ✅ Mentor Approved
                </span>
              )}
            </div>
          </div>
          <StoryPointsBadge points={task.storyPoints} />
        </div>
      </div>

      {/* ✅ MENTOR: Approve/Reject buttons for code tasks in REVIEW */}
      {showApproveReject && (
        <div className="px-3 pb-3 border-t border-amber-100 pt-2 space-y-2">
          <p className="text-xs text-amber-700 font-medium">AI approved this code — your decision:</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => onApprove && onApprove(task.id)}
              className="flex-1 text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition font-medium"
            >
              ✅ Approve → Done
            </button>
            <button
              type="button"
              onClick={() => onReject && onReject(task.id)}
              className="flex-1 text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg hover:bg-red-600 transition font-medium"
            >
              ❌ Reject → Redo
            </button>
          </div>
        </div>
      )}

      {/* MENTOR: Edit / Block / Delete for non-REVIEW code tasks and all non-code tasks */}
      {role === 'MENTOR' && !overlay && !readOnly && !showApproveReject && (
        <div className="flex gap-2 px-3 pb-3 border-t border-gray-100 pt-2 flex-wrap">
          <button
            type="button"
            onClick={() => onEdit && onEdit(task)}
            className="text-xs px-3 py-1 rounded-lg font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
          >
            ✏️ Edit
          </button>
          <button
            type="button"
            onClick={() => onBlock(task.id)}
            className={`text-xs px-3 py-1 rounded-lg font-medium transition ${
              task.blocked
                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                : 'bg-red-50 text-red-500 hover:bg-red-100'
            }`}
          >
            {task.blocked ? 'Unblock' : 'Block'}
          </button>
          <button
            type="button"
            onClick={() => onDelete(task.id)}
            className="text-xs px-3 py-1 rounded-lg font-medium bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500 transition"
          >
            Delete
          </button>
        </div>
      )}

      {/* MENTOR: Show Edit button even on REVIEW code tasks (with warning in modal) */}
      {role === 'MENTOR' && !overlay && !readOnly && showApproveReject && (
        <div className="px-3 pb-3">
          <button
            type="button"
            onClick={() => onEdit && onEdit(task)}
            className="text-xs px-3 py-1 rounded-lg font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
          >
            ✏️ Edit (resets to In Progress)
          </button>
        </div>
      )}

      {/* ✅ INTERN: Write Code — only when IN_PROGRESS */}
      {showWriteCode && (
        <div className="px-3 pb-3 border-t border-gray-100 pt-2">
          <button
            type="button"
            onClick={() => onWriteCode && onWriteCode(task)}
            className="w-full text-xs bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 transition font-medium"
          >
            {task.codeSubmissions?.[0] ? '🔄 Resubmit Code' : '✏️ Write Code'}
          </button>
        </div>
      )}

      {/* INTERN: Show waiting message when in REVIEW */}
      {role === 'INTERN' && !overlay && !readOnly && isMyTask && isCodeTask && task.status === 'REVIEW' && (
        <div className="px-3 pb-3 border-t border-amber-100 pt-2">
          <p className="text-xs text-amber-700 text-center font-medium">
            ⏳ AI approved — waiting for mentor to approve
          </p>
        </div>
      )}
    </div>
  );
}

function KanbanColumn({
  col, tasks, role, userId, onBlock, onDelete, onEdit,
  onWriteCode, onApprove, onReject, readOnly,
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });
  const totalPoints = tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);

  return (
    <div className="flex flex-col min-w-0">
      <div className={`flex items-center justify-between mb-3 pb-2 border-b-2 ${col.color}`}>
        <h3 className="text-sm font-bold text-gray-700">{col.label}</h3>
        <div className="flex items-center gap-1">
          {totalPoints > 0 && (
            <span className="text-xs text-gray-400">{totalPoints}pts</span>
          )}
          <span className="text-xs bg-white border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
      </div>
      <div
        ref={readOnly ? undefined : setNodeRef}
        className={`flex-1 space-y-2 min-h-32 rounded-xl p-2 transition-colors
          ${!readOnly && isOver ? `${col.bg} ring-2 ring-purple-300` : 'bg-transparent'}`}
      >
        {tasks.map((task) => (
          <KanbanCard
            key={task.id}
            task={task}
            role={role}
            userId={userId}
            onBlock={onBlock}
            onDelete={onDelete}
            onEdit={onEdit}
            onWriteCode={onWriteCode}
            onApprove={onApprove}
            onReject={onReject}
            readOnly={readOnly}
          />
        ))}
        {tasks.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-4 italic">
            {readOnly ? 'Empty' : 'Drop cards here'}
          </p>
        )}
      </div>
    </div>
  );
}

export default function KanbanBoard({
  board, role, userId,
  onTaskMove, onTaskBlock, onTaskDelete,
  onTaskEdit, onTaskWriteCode,
  onTaskApprove, onTaskReject,
  readOnly = false,
}) {
  const [activeTask, setActiveTask] = useState(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  );

  const handleDragStart = ({ active }) => {
    const task = active.data.current?.task;
    if (task) setActiveTask(task);
  };

  const handleDragEnd = ({ active, over }) => {
    setActiveTask(null);
    if (!over || readOnly) return;
    const newStatus = over.id;
    const currentStatus = active.data.current?.task?.status;
    if (newStatus !== currentStatus && Object.keys(board.columns).includes(newStatus)) {
      onTaskMove(active.id, newStatus);
    }
  };

  const handleDragCancel = () => setActiveTask(null);

  const totalPoints = Object.values(board.columns).flat().reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  const donePoints = (board.columns.DONE || []).reduce((sum, t) => sum + (t.storyPoints || 0), 0);

  return (
    <div className="space-y-4">
      {totalPoints > 0 && (
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>{donePoints}/{totalPoints} story points completed</span>
          <div className="flex-1 bg-gray-100 rounded-full h-1.5">
            <div
              className="bg-purple-500 h-1.5 rounded-full transition-all"
              style={{ width: `${totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0}%` }}
            />
          </div>
          <span>{totalPoints > 0 ? Math.round((donePoints / totalPoints) * 100) : 0}%</span>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              col={col}
              tasks={board.columns[col.id] || []}
              role={role}
              userId={userId}
              onBlock={onTaskBlock}
              onDelete={onTaskDelete}
              onEdit={onTaskEdit}
              onWriteCode={onTaskWriteCode}
              onApprove={onTaskApprove}
              onReject={onTaskReject}
              readOnly={readOnly}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeTask && (
            <KanbanCard
              task={activeTask}
              role={role}
              userId={userId}
              onBlock={() => {}}
              onDelete={() => {}}
              overlay
              readOnly={false}
            />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}