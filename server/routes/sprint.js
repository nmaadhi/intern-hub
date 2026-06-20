// server/routes/sprint.js
// Full Agile Sprint system:
// - Admin can create sprints for any cohort
// - Mentor can create/manage sprints for their own cohort
// - Sprint lifecycle: PLANNING → ACTIVE → REVIEW → COMPLETED
// - Story points, capacity, velocity, burndown snapshots

const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { verifyToken, requireRole } = require('../middleware/auth');

// ── Helper: normalize a date to midnight (for daily snapshots) ────────
function toMidnight(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ── Helper: take a burndown snapshot for today ────────────────────────
// Called whenever a card moves to DONE or sprint changes phase.
// Upserts so calling it multiple times on the same day is safe.
async function takeSnapshot(sprintId) {
  const tasks = await prisma.sprintTask.findMany({
    where: { sprintId },
    select: { storyPoints: true, status: true },
  });

  const totalPoints = tasks.reduce((sum, t) => sum + t.storyPoints, 0);
  const completedPoints = tasks
    .filter((t) => t.status === 'DONE')
    .reduce((sum, t) => sum + t.storyPoints, 0);
  const remainingPoints = totalPoints - completedPoints;

  const today = toMidnight();

  await prisma.sprintDailySnapshot.upsert({
    where: { sprintId_date: { sprintId, date: today } },
    update: { remainingPoints, completedPoints, totalPoints },
    create: { sprintId, date: today, remainingPoints, completedPoints, totalPoints },
  });

  return { totalPoints, completedPoints, remainingPoints };
}

// ── Helper: full board data for a sprint ─────────────────────────────
async function getBoardData(sprintId) {
  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
    include: {
      cohort: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true, role: true } },
      tasks: {
        orderBy: { order: 'asc' },
        include: {
          assignedTo: { select: { id: true, name: true, internId: true } },
          createdBy: { select: { id: true, name: true } },
        },
      },
      _count: { select: { tasks: true } },
    },
  });

  if (!sprint) return null;

  // Group tasks into columns
  const columns = { TODO: [], IN_PROGRESS: [], REVIEW: [], DONE: [] };
  for (const task of sprint.tasks) {
    columns[task.status]?.push(task);
  }

  // Calculate sprint stats
  const totalPoints = sprint.tasks.reduce((sum, t) => sum + t.storyPoints, 0);
  const completedPoints = sprint.tasks
    .filter((t) => t.status === 'DONE')
    .reduce((sum, t) => sum + t.storyPoints, 0);
  const remainingPoints = totalPoints - completedPoints;
  const progressPct = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;

  // Days remaining
  const now = new Date();
  const end = new Date(sprint.endDate);
  const daysRemaining = Math.max(0, Math.ceil((end - now) / (1000 * 60 * 60 * 24)));

  return {
    ...sprint,
    columns,
    stats: { totalPoints, completedPoints, remainingPoints, progressPct, daysRemaining },
  };
}

// ════════════════════════════════════════════════════════════════════
// SPRINT CRUD
// ════════════════════════════════════════════════════════════════════

// POST /sprints — create a sprint
// Admin: can create for any cohort
// Mentor: can only create for their own cohort
router.post('/sprints', verifyToken, async (req, res) => {
  try {
    const { cohortId, name, goal, startDate, endDate, capacity } = req.body;
    const { userId, role } = req.user;

    if (!cohortId || !name || !startDate || !endDate) {
      return res.status(400).json({ error: 'cohortId, name, startDate and endDate are required' });
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      return res.status(400).json({ error: 'Name must be 2 to 100 characters' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid dates' });
    }
    if (end <= start) {
      return res.status(400).json({ error: 'endDate must be after startDate' });
    }

    const cohort = await prisma.cohort.findUnique({ where: { id: cohortId } });
    if (!cohort) return res.status(404).json({ error: 'Cohort not found' });

    // Role-based cohort access check
    if (role === 'MENTOR' && cohort.mentorId !== userId) {
      return res.status(403).json({ error: 'You do not lead this cohort' });
    }
    if (role === 'INTERN') {
      return res.status(403).json({ error: 'Interns cannot create sprints' });
    }

    const sprint = await prisma.sprint.create({
      data: {
        name: trimmedName,
        goal: goal?.trim() || null,
        startDate: start,
        endDate: end,
        capacity: capacity ? parseInt(capacity) : 0,
        phase: 'PLANNING',
        cohortId,
        createdById: userId,
      },
      include: {
        cohort: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, role: true } },
      },
    });

    // Notify cohort room
    const io = req.app.get('io');
    io.to(`cohort:${cohortId}`).emit('sprint:created', { sprint });

    res.status(201).json({ message: 'Sprint created in Planning phase', sprint });
  } catch (err) {
    console.error('💥 Error creating sprint:', err);
    res.status(500).json({ error: 'Failed to create sprint' });
  }
});

// GET /sprints?cohortId=xxx — list sprints for a cohort
router.get('/sprints', verifyToken, async (req, res) => {
  try {
    const { cohortId } = req.query;
    if (!cohortId) return res.status(400).json({ error: 'cohortId query param required' });

    const sprints = await prisma.sprint.findMany({
      where: { cohortId },
      orderBy: { startDate: 'desc' },
      include: {
        createdBy: { select: { id: true, name: true, role: true } },
        _count: { select: { tasks: true } },
        tasks: { select: { storyPoints: true, status: true } },
      },
    });

    const formatted = sprints.map((s) => {
      const totalPoints = s.tasks.reduce((sum, t) => sum + t.storyPoints, 0);
      const completedPoints = s.tasks
        .filter((t) => t.status === 'DONE')
        .reduce((sum, t) => sum + t.storyPoints, 0);
      return {
        id: s.id,
        name: s.name,
        goal: s.goal,
        phase: s.phase,
        startDate: s.startDate,
        endDate: s.endDate,
        capacity: s.capacity,
        velocity: s.velocity,
        createdBy: s.createdBy,
        taskCount: s._count.tasks,
        totalPoints,
        completedPoints,
        remainingPoints: totalPoints - completedPoints,
        progressPct: totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0,
      };
    });

    res.json({ count: formatted.length, sprints: formatted });
  } catch (err) {
    console.error('💥 Error listing sprints:', err);
    res.status(500).json({ error: 'Failed to fetch sprints' });
  }
});

// GET /sprints/all — admin: all sprints across every cohort
router.get('/sprints/all', verifyToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const sprints = await prisma.sprint.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        cohort: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, role: true } },
        _count: { select: { tasks: true } },
        tasks: { select: { storyPoints: true, status: true } },
      },
    });

    const formatted = sprints.map((s) => {
      const totalPoints = s.tasks.reduce((sum, t) => sum + t.storyPoints, 0);
      const completedPoints = s.tasks
        .filter((t) => t.status === 'DONE')
        .reduce((sum, t) => sum + t.storyPoints, 0);
      return {
        id: s.id,
        name: s.name,
        goal: s.goal,
        phase: s.phase,
        startDate: s.startDate,
        endDate: s.endDate,
        capacity: s.capacity,
        velocity: s.velocity,
        cohort: s.cohort,
        createdBy: s.createdBy,
        taskCount: s._count.tasks,
        totalPoints,
        completedPoints,
        progressPct: totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0,
      };
    });

    res.json({ count: formatted.length, sprints: formatted });
  } catch (err) {
    console.error('💥 Error listing all sprints:', err);
    res.status(500).json({ error: 'Failed to fetch sprints' });
  }
});

// GET /sprints/:id/board — full board with tasks grouped by column
router.get('/sprints/:id/board', verifyToken, async (req, res) => {
  try {
    const board = await getBoardData(req.params.id);
    if (!board) return res.status(404).json({ error: 'Sprint not found' });
    res.json({ board });
  } catch (err) {
    console.error('💥 Error fetching board:', err);
    res.status(500).json({ error: 'Failed to fetch board' });
  }
});

// GET /sprints/:id/burndown — daily snapshots for the burndown chart
router.get('/sprints/:id/burndown', verifyToken, async (req, res) => {
  try {
    const sprint = await prisma.sprint.findUnique({
      where: { id: req.params.id },
      select: { id: true, startDate: true, endDate: true, capacity: true, phase: true },
    });
    if (!sprint) return res.status(404).json({ error: 'Sprint not found' });

    const snapshots = await prisma.sprintDailySnapshot.findMany({
      where: { sprintId: req.params.id },
      orderBy: { date: 'asc' },
    });

    // Build ideal burndown line (straight line from totalPoints to 0)
    const firstSnap = snapshots[0];
    const totalPoints = firstSnap?.totalPoints || 0;
    const start = toMidnight(sprint.startDate);
    const end = toMidnight(sprint.endDate);
    const totalDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
    const idealLine = Array.from({ length: totalDays + 1 }, (_, i) => ({
      date: new Date(start.getTime() + i * 86400000).toISOString().split('T')[0],
      ideal: Math.round(totalPoints - (totalPoints / totalDays) * i),
    }));

    res.json({
      sprint: { id: sprint.id, startDate: sprint.startDate, endDate: sprint.endDate, phase: sprint.phase },
      snapshots: snapshots.map((s) => ({
        date: s.date.toISOString().split('T')[0],
        remainingPoints: s.remainingPoints,
        completedPoints: s.completedPoints,
        totalPoints: s.totalPoints,
      })),
      idealLine,
      totalPoints,
    });
  } catch (err) {
    console.error('💥 Error fetching burndown:', err);
    res.status(500).json({ error: 'Failed to fetch burndown data' });
  }
});

// ════════════════════════════════════════════════════════════════════
// SPRINT PHASE TRANSITIONS
// ════════════════════════════════════════════════════════════════════

// PATCH /sprints/:id/phase — advance sprint to next phase
// PLANNING → ACTIVE → REVIEW → COMPLETED
router.patch('/sprints/:id/phase', verifyToken, async (req, res) => {
  try {
    const { phase } = req.body;
    const { userId, role } = req.user;

    const validPhases = ['ACTIVE', 'REVIEW', 'COMPLETED'];
    if (!validPhases.includes(phase)) {
      return res.status(400).json({ error: 'Phase must be ACTIVE, REVIEW, or COMPLETED' });
    }

    const sprint = await prisma.sprint.findUnique({
      where: { id: req.params.id },
      include: {
        tasks: { select: { storyPoints: true, status: true } },
        cohort: { select: { id: true, mentorId: true } },
      },
    });

    if (!sprint) return res.status(404).json({ error: 'Sprint not found' });

    // Access check: admin or mentor who leads this cohort
    if (role === 'MENTOR' && sprint.cohort.mentorId !== userId) {
      return res.status(403).json({ error: 'You do not lead this cohort' });
    }
    if (role === 'INTERN') {
      return res.status(403).json({ error: 'Interns cannot change sprint phase' });
    }

    // Enforce valid phase progression
    const phaseOrder = { PLANNING: 0, ACTIVE: 1, REVIEW: 2, COMPLETED: 3 };
    if (phaseOrder[phase] !== phaseOrder[sprint.phase] + 1) {
      return res.status(400).json({
        error: `Cannot go from ${sprint.phase} to ${phase}. Must follow: PLANNING → ACTIVE → REVIEW → COMPLETED`,
      });
    }

    // Phase-specific rules
    if (phase === 'ACTIVE') {
      if (sprint.tasks.length === 0) {
        return res.status(400).json({ error: 'Add at least one card before starting the sprint' });
      }
      // Take initial burndown snapshot when sprint goes active
      await takeSnapshot(sprint.id);
    }

    if (phase === 'REVIEW') {
      // Take final snapshot when sprint moves to review
      await takeSnapshot(sprint.id);
    }

    // Calculate velocity when completing
    let velocity = sprint.velocity;
    if (phase === 'COMPLETED') {
      velocity = sprint.tasks
        .filter((t) => t.status === 'DONE')
        .reduce((sum, t) => sum + t.storyPoints, 0);
    }

    const updated = await prisma.sprint.update({
      where: { id: req.params.id },
      data: { phase, velocity },
      include: {
        cohort: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    // Broadcast phase change to cohort room
    const io = req.app.get('io');
    io.to(`cohort:${sprint.cohort.id}`).emit('sprint:phase_changed', {
      sprintId: sprint.id,
      phase,
      velocity: updated.velocity,
    });

    io.to(`cohort:${sprint.cohort.id}`).emit('notification:new', {
      type: 'SPRINT_PHASE',
      message: `Sprint "${sprint.name}" moved to ${phase}`,
      targetUserId: null,
    });

    res.json({ message: `Sprint moved to ${phase}`, sprint: updated });
  } catch (err) {
    console.error('💥 Error changing sprint phase:', err);
    res.status(500).json({ error: 'Failed to update sprint phase' });
  }
});

// PATCH /sprints/:id/capacity — update sprint capacity (planning phase only)
router.patch('/sprints/:id/capacity', verifyToken, async (req, res) => {
  try {
    const { capacity } = req.body;
    const { userId, role } = req.user;

    if (capacity === undefined || capacity < 0) {
      return res.status(400).json({ error: 'Capacity must be a non-negative number' });
    }

    const sprint = await prisma.sprint.findUnique({
      where: { id: req.params.id },
      include: { cohort: { select: { mentorId: true } } },
    });
    if (!sprint) return res.status(404).json({ error: 'Sprint not found' });
    if (sprint.phase !== 'PLANNING') {
      return res.status(400).json({ error: 'Capacity can only be changed during Planning phase' });
    }
    if (role === 'MENTOR' && sprint.cohort.mentorId !== userId) {
      return res.status(403).json({ error: 'You do not lead this cohort' });
    }

    const updated = await prisma.sprint.update({
      where: { id: req.params.id },
      data: { capacity: parseInt(capacity) },
    });

    res.json({ message: 'Capacity updated', sprint: updated });
  } catch (err) {
    console.error('💥 Error updating capacity:', err);
    res.status(500).json({ error: 'Failed to update capacity' });
  }
});

// PATCH /sprints/:id/review — save review notes (review phase only)
router.patch('/sprints/:id/review', verifyToken, async (req, res) => {
  try {
    const { reviewNotes } = req.body;
    const { userId, role } = req.user;

    const sprint = await prisma.sprint.findUnique({
      where: { id: req.params.id },
      include: { cohort: { select: { mentorId: true } } },
    });
    if (!sprint) return res.status(404).json({ error: 'Sprint not found' });
    if (sprint.phase !== 'REVIEW') {
      return res.status(400).json({ error: 'Review notes can only be added during Review phase' });
    }
    if (role === 'MENTOR' && sprint.cohort.mentorId !== userId) {
      return res.status(403).json({ error: 'You do not lead this cohort' });
    }

    const updated = await prisma.sprint.update({
      where: { id: req.params.id },
      data: { reviewNotes: reviewNotes?.trim() || null },
    });

    res.json({ message: 'Review notes saved', sprint: updated });
  } catch (err) {
    console.error('💥 Error saving review notes:', err);
    res.status(500).json({ error: 'Failed to save review notes' });
  }
});

// ════════════════════════════════════════════════════════════════════
// SPRINT TASKS (CARDS)
// ════════════════════════════════════════════════════════════════════

// POST /sprints/:id/tasks — create a card
// Only allowed in PLANNING and ACTIVE phases
router.post('/sprints/:id/tasks', verifyToken, async (req, res) => {
  try {
    const { title, description, assignedToId, storyPoints } = req.body;
    const sprintId = req.params.id;
    const { userId, role } = req.user;

    if (!title) return res.status(400).json({ error: 'Title is required' });
    if (role === 'INTERN') return res.status(403).json({ error: 'Interns cannot create cards' });

    const sprint = await prisma.sprint.findUnique({
      where: { id: sprintId },
      include: { cohort: { select: { id: true, mentorId: true } } },
    });
    if (!sprint) return res.status(404).json({ error: 'Sprint not found' });

    if (!['PLANNING', 'ACTIVE'].includes(sprint.phase)) {
      return res.status(400).json({ error: `Cannot add cards to a ${sprint.phase} sprint` });
    }

    if (role === 'MENTOR' && sprint.cohort.mentorId !== userId) {
      return res.status(403).json({ error: 'You do not lead this cohort' });
    }

    const validPoints = [0, 1, 2, 3, 5, 8, 13];
    const points = storyPoints !== undefined ? parseInt(storyPoints) : 0;
    if (!validPoints.includes(points)) {
      return res.status(400).json({ error: 'Story points must be 0, 1, 2, 3, 5, 8, or 13' });
    }

    if (assignedToId) {
      const intern = await prisma.user.findUnique({ where: { id: assignedToId } });
      if (!intern) return res.status(404).json({ error: 'Intern not found' });
    }

    const maxOrder = await prisma.sprintTask.count({ where: { sprintId, status: 'TODO' } });

    const task = await prisma.sprintTask.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        storyPoints: points,
        sprintId,
        assignedToId: assignedToId || null,
        createdById: userId,
        order: maxOrder,
      },
      include: {
        assignedTo: { select: { id: true, name: true, internId: true } },
        createdBy: { select: { id: true, name: true, role: true } },
      },
    });

    const creator = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, role: true },
    });

    const io = req.app.get('io');
    io.to(`cohort:${sprint.cohort.id}`).emit('task:created', {
      task,
      createdBy: { id: creator.id, name: creator.name, role: creator.role },
    });

    if (assignedToId) {
      io.to(`cohort:${sprint.cohort.id}`).emit('notification:new', {
        type: 'TASK_ASSIGNED',
        message: `New card assigned to you: ${task.title} (${points} pts)`,
        targetUserId: assignedToId,
      });
    }

    // Update burndown snapshot if sprint is active
    if (sprint.phase === 'ACTIVE') {
      await takeSnapshot(sprintId);
    }

    res.status(201).json({ message: 'Card created', task });
  } catch (err) {
    console.error('💥 Error creating task:', err);
    res.status(500).json({ error: 'Failed to create card' });
  }
});

// PATCH /tasks/:id/move — move card to new column
// Only allowed in ACTIVE phase
router.patch('/tasks/:id/move', verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Status must be TODO, IN_PROGRESS, REVIEW, or DONE' });
    }

    const task = await prisma.sprintTask.findUnique({
      where: { id: req.params.id },
      include: { sprint: { include: { cohort: true } } },
    });
    if (!task) return res.status(404).json({ error: 'Card not found' });

    if (task.sprint.phase !== 'ACTIVE') {
      return res.status(400).json({ error: `Cannot move cards — sprint is in ${task.sprint.phase} phase` });
    }

    const isMentor = task.sprint.createdById === req.user.userId ||
      task.sprint.cohort.mentorId === req.user.userId;
    const isAssignedIntern = task.assignedToId === req.user.userId;
    const isAdmin = req.user.role === 'ADMIN';

    if (!isMentor && !isAssignedIntern && !isAdmin) {
      return res.status(403).json({ error: 'You cannot move this card' });
    }

    const oldStatus = task.status;

    const updated = await prisma.sprintTask.update({
      where: { id: req.params.id },
      data: { status },
      include: {
        assignedTo: { select: { id: true, name: true, internId: true } },
        createdBy: { select: { id: true, name: true } },
      },
    });

    // Take burndown snapshot whenever a card moves (especially to DONE)
    await takeSnapshot(task.sprintId);

    const mover = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, name: true, role: true },
    });

    const io = req.app.get('io');
    io.to(`cohort:${task.sprint.cohort.id}`).emit('task:moved', {
      taskId: task.id,
      newStatus: status,
      oldStatus,
      task: updated,
      movedBy: { id: mover.id, name: mover.name, role: mover.role },
    });

    res.json({ message: 'Card moved', task: updated });
  } catch (err) {
    console.error('💥 Error moving card:', err);
    res.status(500).json({ error: 'Failed to move card' });
  }
});

// PATCH /tasks/:id/points — update story points
// Only allowed in PLANNING phase
router.patch('/tasks/:id/points', verifyToken, async (req, res) => {
  try {
    const { storyPoints } = req.body;
    const { userId, role } = req.user;

    const validPoints = [0, 1, 2, 3, 5, 8, 13];
    const points = parseInt(storyPoints);
    if (!validPoints.includes(points)) {
      return res.status(400).json({ error: 'Story points must be 0, 1, 2, 3, 5, 8, or 13' });
    }

    const task = await prisma.sprintTask.findUnique({
      where: { id: req.params.id },
      include: { sprint: { include: { cohort: true } } },
    });
    if (!task) return res.status(404).json({ error: 'Card not found' });

    if (!['PLANNING', 'ACTIVE'].includes(task.sprint.phase)) {
  return res.status(400).json({ error: 'Story points can only be changed during Planning or Active phase' });
}
    
    if (role === 'INTERN') {
      return res.status(403).json({ error: 'Interns cannot change story points' });
    }
    if (role === 'MENTOR' && task.sprint.cohort.mentorId !== userId) {
      return res.status(403).json({ error: 'You do not lead this cohort' });
    }

    const updated = await prisma.sprintTask.update({
      where: { id: req.params.id },
      data: { storyPoints: points },
      include: {
        assignedTo: { select: { id: true, name: true, internId: true } },
      },
    });

    const io = req.app.get('io');
    io.to(`cohort:${task.sprint.cohort.id}`).emit('task:points_updated', {
      taskId: task.id,
      storyPoints: points,
      task: updated,
    });

    res.json({ message: 'Story points updated', task: updated });
  } catch (err) {
    console.error('💥 Error updating story points:', err);
    res.status(500).json({ error: 'Failed to update story points' });
  }
});

// PATCH /tasks/:id/assign — assign or reassign intern
router.patch('/tasks/:id/assign', verifyToken, async (req, res) => {
  try {
    const { assignedToId } = req.body;
    const { userId, role } = req.user;

    const task = await prisma.sprintTask.findUnique({
      where: { id: req.params.id },
      include: { sprint: { include: { cohort: true } } },
    });
    if (!task) return res.status(404).json({ error: 'Card not found' });

    if (!['PLANNING', 'ACTIVE'].includes(task.sprint.phase)) {
      return res.status(400).json({ error: 'Cannot reassign cards in this phase' });
    }
    if (role === 'INTERN') {
      return res.status(403).json({ error: 'Interns cannot assign cards' });
    }
    if (role === 'MENTOR' && task.sprint.cohort.mentorId !== userId) {
      return res.status(403).json({ error: 'You do not lead this cohort' });
    }

    const updated = await prisma.sprintTask.update({
      where: { id: req.params.id },
      data: { assignedToId: assignedToId || null },
      include: {
        assignedTo: { select: { id: true, name: true, internId: true } },
      },
    });

    const io = req.app.get('io');
    io.to(`cohort:${task.sprint.cohort.id}`).emit('task:assigned', {
      taskId: task.id,
      assignedTo: updated.assignedTo,
    });

    if (assignedToId) {
      io.to(`cohort:${task.sprint.cohort.id}`).emit('notification:new', {
        type: 'TASK_ASSIGNED',
        message: `Card assigned to you: ${task.title}`,
        targetUserId: assignedToId,
      });
    }

    res.json({ message: 'Card assigned', task: updated });
  } catch (err) {
    console.error('💥 Error assigning card:', err);
    res.status(500).json({ error: 'Failed to assign card' });
  }
});

// PATCH /tasks/:id/block — toggle blocked flag (mentor/admin only)
router.patch('/tasks/:id/block', verifyToken, async (req, res) => {
  try {
    const { userId, role } = req.user;

    const task = await prisma.sprintTask.findUnique({
      where: { id: req.params.id },
      include: { sprint: { include: { cohort: true } } },
    });
    if (!task) return res.status(404).json({ error: 'Card not found' });
    if (role === 'INTERN') return res.status(403).json({ error: 'Interns cannot block cards' });
    if (role === 'MENTOR' && task.sprint.cohort.mentorId !== userId) {
      return res.status(403).json({ error: 'You do not lead this cohort' });
    }

    const updated = await prisma.sprintTask.update({
      where: { id: req.params.id },
      data: { blocked: !task.blocked },
      include: { assignedTo: { select: { id: true, name: true } } },
    });

    const io = req.app.get('io');
    io.to(`cohort:${task.sprint.cohort.id}`).emit('task:blocked', {
      taskId: task.id,
      blocked: updated.blocked,
      task: updated,
    });

    if (updated.blocked) {
      io.to(`cohort:${task.sprint.cohort.id}`).emit('notification:new', {
        type: 'TASK_BLOCKED',
        message: `🚫 Card blocked: ${task.title}`,
        targetUserId: null,
      });
    }

    res.json({ message: `Card ${updated.blocked ? 'blocked' : 'unblocked'}`, task: updated });
  } catch (err) {
    console.error('💥 Error toggling block:', err);
    res.status(500).json({ error: 'Failed to update card' });
  }
});

// DELETE /tasks/:id — delete a card (planning phase only)
router.delete('/tasks/:id', verifyToken, async (req, res) => {
  try {
    const { userId, role } = req.user;

    const task = await prisma.sprintTask.findUnique({
      where: { id: req.params.id },
      include: { sprint: { include: { cohort: true } } },
    });
    if (!task) return res.status(404).json({ error: 'Card not found' });

    if (!['PLANNING', 'ACTIVE'].includes(task.sprint.phase)) {
  return res.status(400).json({ error: 'Cards can only be deleted during Planning or Active phase' });
}
    if (role === 'INTERN') return res.status(403).json({ error: 'Interns cannot delete cards' });
    if (role === 'MENTOR' && task.sprint.cohort.mentorId !== userId) {
      return res.status(403).json({ error: 'You do not lead this cohort' });
    }

    await prisma.sprintTask.delete({ where: { id: req.params.id } });

    const io = req.app.get('io');
    io.to(`cohort:${task.sprint.cohort.id}`).emit('task:deleted', { taskId: task.id });

    res.json({ message: 'Card deleted' });
  } catch (err) {
    console.error('💥 Error deleting card:', err);
    res.status(500).json({ error: 'Failed to delete card' });
  }
});

module.exports = router;