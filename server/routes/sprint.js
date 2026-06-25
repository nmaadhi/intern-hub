// server/routes/sprint.js
const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { verifyToken, requireRole } = require('../middleware/auth');
const Groq = require('groq-sdk');

let groq = null;
function getGroq() {
  if (!groq) groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  return groq;
}

function toMidnight(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function takeSnapshot(sprintId) {
  const tasks = await prisma.sprintTask.findMany({
    where: { sprintId },
    select: { storyPoints: true, status: true },
  });
  const totalPoints = tasks.reduce((sum, t) => sum + t.storyPoints, 0);
  const completedPoints = tasks.filter((t) => t.status === 'DONE').reduce((sum, t) => sum + t.storyPoints, 0);
  const remainingPoints = totalPoints - completedPoints;
  const today = toMidnight();
  await prisma.sprintDailySnapshot.upsert({
    where: { sprintId_date: { sprintId, date: today } },
    update: { remainingPoints, completedPoints, totalPoints },
    create: { sprintId, date: today, remainingPoints, completedPoints, totalPoints },
  });
  return { totalPoints, completedPoints, remainingPoints };
}

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
          codeSubmissions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { id: true, aiVerdict: true, passed: true, createdAt: true },
          },
        },
      },
      _count: { select: { tasks: true } },
    },
  });
  if (!sprint) return null;
  const columns = { TODO: [], IN_PROGRESS: [], REVIEW: [], DONE: [] };
  for (const task of sprint.tasks) {
    columns[task.status]?.push(task);
  }
  const totalPoints = sprint.tasks.reduce((sum, t) => sum + t.storyPoints, 0);
  const completedPoints = sprint.tasks.filter((t) => t.status === 'DONE').reduce((sum, t) => sum + t.storyPoints, 0);
  const remainingPoints = totalPoints - completedPoints;
  const progressPct = totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0;
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
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return res.status(400).json({ error: 'Invalid dates' });
    if (end <= start) return res.status(400).json({ error: 'endDate must be after startDate' });
    const cohort = await prisma.cohort.findUnique({ where: { id: cohortId } });
    if (!cohort) return res.status(404).json({ error: 'Cohort not found' });
    if (role === 'MENTOR' && cohort.mentorId !== userId) return res.status(403).json({ error: 'You do not lead this cohort' });
    if (role === 'INTERN') return res.status(403).json({ error: 'Interns cannot create sprints' });
    const sprint = await prisma.sprint.create({
      data: {
        name: trimmedName, goal: goal?.trim() || null,
        startDate: start, endDate: end,
        capacity: capacity ? parseInt(capacity) : 0,
        phase: 'PLANNING', cohortId, createdById: userId,
      },
      include: {
        cohort: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, role: true } },
      },
    });
    const io = req.app.get('io');
    io.to(`cohort:${cohortId}`).emit('sprint:created', { sprint });
    res.status(201).json({ message: 'Sprint created in Planning phase', sprint });
  } catch (err) {
    console.error('💥 Error creating sprint:', err);
    res.status(500).json({ error: 'Failed to create sprint' });
  }
});

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
      const completedPoints = s.tasks.filter((t) => t.status === 'DONE').reduce((sum, t) => sum + t.storyPoints, 0);
      return {
        id: s.id, name: s.name, goal: s.goal, phase: s.phase,
        startDate: s.startDate, endDate: s.endDate,
        capacity: s.capacity, velocity: s.velocity,
        createdBy: s.createdBy, taskCount: s._count.tasks,
        totalPoints, completedPoints,
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
      const completedPoints = s.tasks.filter((t) => t.status === 'DONE').reduce((sum, t) => sum + t.storyPoints, 0);
      return {
        id: s.id, name: s.name, goal: s.goal, phase: s.phase,
        startDate: s.startDate, endDate: s.endDate,
        capacity: s.capacity, velocity: s.velocity,
        cohort: s.cohort, createdBy: s.createdBy, taskCount: s._count.tasks,
        totalPoints, completedPoints,
        progressPct: totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0,
      };
    });
    res.json({ count: formatted.length, sprints: formatted });
  } catch (err) {
    console.error('💥 Error listing all sprints:', err);
    res.status(500).json({ error: 'Failed to fetch sprints' });
  }
});

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
      idealLine, totalPoints,
    });
  } catch (err) {
    console.error('💥 Error fetching burndown:', err);
    res.status(500).json({ error: 'Failed to fetch burndown data' });
  }
});

// ════════════════════════════════════════════════════════════════════
// SPRINT PHASE TRANSITIONS
// ════════════════════════════════════════════════════════════════════

router.patch('/sprints/:id/phase', verifyToken, async (req, res) => {
  try {
    const { phase } = req.body;
    const { userId, role } = req.user;
    const validPhases = ['ACTIVE', 'REVIEW', 'COMPLETED'];
    if (!validPhases.includes(phase)) return res.status(400).json({ error: 'Phase must be ACTIVE, REVIEW, or COMPLETED' });
    const sprint = await prisma.sprint.findUnique({
      where: { id: req.params.id },
      include: { tasks: { select: { storyPoints: true, status: true } }, cohort: { select: { id: true, mentorId: true } } },
    });
    if (!sprint) return res.status(404).json({ error: 'Sprint not found' });
    if (role === 'MENTOR' && sprint.cohort.mentorId !== userId) return res.status(403).json({ error: 'You do not lead this cohort' });
    if (role === 'INTERN') return res.status(403).json({ error: 'Interns cannot change sprint phase' });
    const phaseOrder = { PLANNING: 0, ACTIVE: 1, REVIEW: 2, COMPLETED: 3 };
    if (phaseOrder[phase] !== phaseOrder[sprint.phase] + 1) {
      return res.status(400).json({ error: `Cannot go from ${sprint.phase} to ${phase}` });
    }
    if (phase === 'ACTIVE') {
      if (sprint.tasks.length === 0) return res.status(400).json({ error: 'Add at least one card before starting the sprint' });
      await takeSnapshot(sprint.id);
    }
    if (phase === 'REVIEW') await takeSnapshot(sprint.id);
    let velocity = sprint.velocity;
    if (phase === 'COMPLETED') {
      velocity = sprint.tasks.filter((t) => t.status === 'DONE').reduce((sum, t) => sum + t.storyPoints, 0);
    }
    const updated = await prisma.sprint.update({
      where: { id: req.params.id },
      data: { phase, velocity },
      include: { cohort: { select: { id: true, name: true } }, createdBy: { select: { id: true, name: true } } },
    });
    const io = req.app.get('io');
    io.to(`cohort:${sprint.cohort.id}`).emit('sprint:phase_changed', { sprintId: sprint.id, phase, velocity: updated.velocity });
    io.to(`cohort:${sprint.cohort.id}`).emit('notification:new', { type: 'SPRINT_PHASE', message: `Sprint "${sprint.name}" moved to ${phase}`, targetUserId: null });
    res.json({ message: `Sprint moved to ${phase}`, sprint: updated });
  } catch (err) {
    console.error('💥 Error changing sprint phase:', err);
    res.status(500).json({ error: 'Failed to update sprint phase' });
  }
});

router.patch('/sprints/:id/capacity', verifyToken, async (req, res) => {
  try {
    const { capacity } = req.body;
    const { userId, role } = req.user;
    if (capacity === undefined || capacity < 0) return res.status(400).json({ error: 'Capacity must be a non-negative number' });
    const sprint = await prisma.sprint.findUnique({ where: { id: req.params.id }, include: { cohort: { select: { mentorId: true } } } });
    if (!sprint) return res.status(404).json({ error: 'Sprint not found' });
    if (sprint.phase !== 'PLANNING') return res.status(400).json({ error: 'Capacity can only be changed during Planning phase' });
    if (role === 'MENTOR' && sprint.cohort.mentorId !== userId) return res.status(403).json({ error: 'You do not lead this cohort' });
    const updated = await prisma.sprint.update({ where: { id: req.params.id }, data: { capacity: parseInt(capacity) } });
    res.json({ message: 'Capacity updated', sprint: updated });
  } catch (err) {
    console.error('💥 Error updating capacity:', err);
    res.status(500).json({ error: 'Failed to update capacity' });
  }
});

router.patch('/sprints/:id/review', verifyToken, async (req, res) => {
  try {
    const { reviewNotes } = req.body;
    const { userId, role } = req.user;
    const sprint = await prisma.sprint.findUnique({ where: { id: req.params.id }, include: { cohort: { select: { mentorId: true } } } });
    if (!sprint) return res.status(404).json({ error: 'Sprint not found' });
    if (sprint.phase !== 'REVIEW') return res.status(400).json({ error: 'Review notes can only be added during Review phase' });
    if (role === 'MENTOR' && sprint.cohort.mentorId !== userId) return res.status(403).json({ error: 'You do not lead this cohort' });
    const updated = await prisma.sprint.update({ where: { id: req.params.id }, data: { reviewNotes: reviewNotes?.trim() || null } });
    res.json({ message: 'Review notes saved', sprint: updated });
  } catch (err) {
    console.error('💥 Error saving review notes:', err);
    res.status(500).json({ error: 'Failed to save review notes' });
  }
});

router.delete('/sprints/:id', verifyToken, async (req, res) => {
  try {
    const { userId, role } = req.user;
    const sprint = await prisma.sprint.findUnique({
      where: { id: req.params.id },
      include: { cohort: { select: { id: true, mentorId: true } } },
    });
    if (!sprint) return res.status(404).json({ error: 'Sprint not found' });
    if (role === 'MENTOR' && sprint.cohort.mentorId !== userId) return res.status(403).json({ error: 'You do not lead this cohort' });
    if (role === 'INTERN') return res.status(403).json({ error: 'Interns cannot delete sprints' });
    if (sprint.phase === 'COMPLETED') return res.status(400).json({ error: 'Cannot delete a completed sprint' });
    await prisma.sprint.delete({ where: { id: req.params.id } });
    const io = req.app.get('io');
    io.to(`cohort:${sprint.cohort.id}`).emit('sprint:deleted', { sprintId: sprint.id });
    res.json({ message: 'Sprint deleted successfully' });
  } catch (err) {
    console.error('💥 Error deleting sprint:', err);
    res.status(500).json({ error: 'Failed to delete sprint' });
  }
});

// ════════════════════════════════════════════════════════════════════
// SPRINT TASKS (CARDS)
// ════════════════════════════════════════════════════════════════════

router.post('/sprints/:id/tasks', verifyToken, async (req, res) => {
  try {
    const { title, description, assignedToId, storyPoints, isCodeTask, codeLanguage } = req.body;
    const sprintId = req.params.id;
    const { userId, role } = req.user;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    if (role === 'INTERN') return res.status(403).json({ error: 'Interns cannot create cards' });
    const sprint = await prisma.sprint.findUnique({ where: { id: sprintId }, include: { cohort: { select: { id: true, mentorId: true } } } });
    if (!sprint) return res.status(404).json({ error: 'Sprint not found' });
    if (!['PLANNING', 'ACTIVE'].includes(sprint.phase)) return res.status(400).json({ error: `Cannot add cards to a ${sprint.phase} sprint` });
    if (role === 'MENTOR' && sprint.cohort.mentorId !== userId) return res.status(403).json({ error: 'You do not lead this cohort' });

    // ✅ Allow any non-negative integer for story points
    const points = storyPoints !== undefined ? Math.max(0, parseInt(storyPoints) || 0) : 0;

    if (assignedToId) {
      const intern = await prisma.user.findUnique({ where: { id: assignedToId } });
      if (!intern) return res.status(404).json({ error: 'Intern not found' });
    }
    const maxOrder = await prisma.sprintTask.count({ where: { sprintId, status: 'TODO' } });
    const task = await prisma.sprintTask.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        storyPoints: points, sprintId,
        assignedToId: assignedToId || null,
        createdById: userId, order: maxOrder,
        isCodeTask: isCodeTask || false,
        codeLanguage: isCodeTask ? (codeLanguage || 'python') : null,
      },
      include: {
        assignedTo: { select: { id: true, name: true, internId: true } },
        createdBy: { select: { id: true, name: true, role: true } },
      },
    });
    const creator = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, role: true } });
    const io = req.app.get('io');
    io.to(`cohort:${sprint.cohort.id}`).emit('task:created', { task, createdBy: creator });
    if (assignedToId) {
      io.to(`cohort:${sprint.cohort.id}`).emit('notification:new', {
        type: 'TASK_ASSIGNED',
        message: `New card assigned to you: ${task.title} (${points} pts)${isCodeTask ? ' 💻 Code Task' : ''}`,
        targetUserId: assignedToId,
      });
    }
    if (sprint.phase === 'ACTIVE') await takeSnapshot(sprintId);
    res.status(201).json({ message: 'Card created', task });
  } catch (err) {
    console.error('💥 Error creating task:', err);
    res.status(500).json({ error: 'Failed to create card' });
  }
});

router.patch('/tasks/:id/move', verifyToken, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const task = await prisma.sprintTask.findUnique({ where: { id: req.params.id }, include: { sprint: { include: { cohort: true } } } });
    if (!task) return res.status(404).json({ error: 'Card not found' });
    if (task.sprint.phase !== 'ACTIVE') return res.status(400).json({ error: `Cannot move cards — sprint is in ${task.sprint.phase} phase` });

    // ✅ Code task: intern can only move to DONE if AI passed AND mentor approved (already in REVIEW)
    if (task.isCodeTask && status === 'DONE' && req.user.role === 'INTERN') {
      return res.status(403).json({ error: 'Your code is in Review. Wait for mentor to approve it.' });
    }

    const isMentor = task.sprint.createdById === req.user.userId || task.sprint.cohort.mentorId === req.user.userId;
    const isAssignedIntern = task.assignedToId === req.user.userId;
    const isAdmin = req.user.role === 'ADMIN';
    if (!isMentor && !isAssignedIntern && !isAdmin) return res.status(403).json({ error: 'You cannot move this card' });
    const oldStatus = task.status;
    const updated = await prisma.sprintTask.update({
      where: { id: req.params.id },
      data: { status },
      include: {
        assignedTo: { select: { id: true, name: true, internId: true } },
        createdBy: { select: { id: true, name: true } },
        codeSubmissions: { orderBy: { createdAt: 'desc' }, take: 1, select: { id: true, aiVerdict: true, passed: true, createdAt: true } },
      },
    });
    await takeSnapshot(task.sprintId);
    const mover = await prisma.user.findUnique({ where: { id: req.user.userId }, select: { id: true, name: true, role: true } });
    const io = req.app.get('io');
    io.to(`cohort:${task.sprint.cohort.id}`).emit('task:moved', { taskId: task.id, newStatus: status, oldStatus, task: updated, movedBy: mover });
    res.json({ message: 'Card moved', task: updated });
  } catch (err) {
    console.error('💥 Error moving card:', err);
    res.status(500).json({ error: 'Failed to move card' });
  }
});

router.patch('/tasks/:id/points', verifyToken, async (req, res) => {
  try {
    const { storyPoints } = req.body;
    const { userId, role } = req.user;

    // ✅ Allow any non-negative integer
    const points = Math.max(0, parseInt(storyPoints) || 0);

    const task = await prisma.sprintTask.findUnique({ where: { id: req.params.id }, include: { sprint: { include: { cohort: true } } } });
    if (!task) return res.status(404).json({ error: 'Card not found' });
    if (!['PLANNING', 'ACTIVE'].includes(task.sprint.phase)) return res.status(400).json({ error: 'Story points can only be changed during Planning or Active phase' });
    if (role === 'INTERN') return res.status(403).json({ error: 'Interns cannot change story points' });
    if (role === 'MENTOR' && task.sprint.cohort.mentorId !== userId) return res.status(403).json({ error: 'You do not lead this cohort' });
    const updated = await prisma.sprintTask.update({
      where: { id: req.params.id },
      data: { storyPoints: points },
      include: { assignedTo: { select: { id: true, name: true, internId: true } } },
    });
    const io = req.app.get('io');
    io.to(`cohort:${task.sprint.cohort.id}`).emit('task:points_updated', { taskId: task.id, storyPoints: points, task: updated });
    res.json({ message: 'Story points updated', task: updated });
  } catch (err) {
    console.error('💥 Error updating story points:', err);
    res.status(500).json({ error: 'Failed to update story points' });
  }
});

router.patch('/tasks/:id/edit', verifyToken, requireRole('MENTOR'), async (req, res) => {
  try {
    const { title, description, storyPoints, assignedToId, isCodeTask, codeLanguage } = req.body;
    const task = await prisma.sprintTask.findUnique({
      where: { id: req.params.id },
      include: { sprint: { include: { cohort: true } } },
    });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.sprint.cohort.mentorId !== req.user.userId) return res.status(403).json({ error: 'Not your sprint' });

    const updateData = {
      ...(title !== undefined && { title: title.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(storyPoints !== undefined && { storyPoints: Math.max(0, parseInt(storyPoints) || 0) }),
      ...(assignedToId !== undefined && { assignedToId: assignedToId || null }),
      ...(isCodeTask !== undefined && { isCodeTask }),
      ...(codeLanguage !== undefined && { codeLanguage }),
    };

    // ✅ If code task was DONE or REVIEW — reset to IN_PROGRESS and delete submissions
    if (task.isCodeTask && (task.status === 'DONE' || task.status === 'REVIEW')) {
      updateData.status = 'IN_PROGRESS';
      await prisma.codeSubmission.deleteMany({ where: { taskId: task.id } });
    }

    const updated = await prisma.sprintTask.update({
      where: { id: req.params.id },
      data: updateData,
      include: { assignedTo: { select: { id: true, name: true, internId: true } } },
    });

    const io = req.app.get('io');
    io.to(`cohort:${task.sprint.cohortId}`).emit('task:edited', { task: updated });

    // Notify intern to resubmit
    if (updateData.status === 'IN_PROGRESS' && updated.assignedToId) {
      io.to(`cohort:${task.sprint.cohortId}`).emit('notification:new', {
        type: 'TASK_ASSIGNED',
        message: `🔄 Mentor updated "${updated.title}" — please resubmit your code.`,
        targetUserId: updated.assignedToId,
      });
    }

    res.json({ task: updated });
  } catch (err) {
    console.error('💥 Error editing task:', err);
    res.status(500).json({ error: 'Failed to edit task' });
  }
});

router.patch('/tasks/:id/assign', verifyToken, async (req, res) => {
  try {
    const { assignedToId } = req.body;
    const { userId, role } = req.user;
    const task = await prisma.sprintTask.findUnique({ where: { id: req.params.id }, include: { sprint: { include: { cohort: true } } } });
    if (!task) return res.status(404).json({ error: 'Card not found' });
    if (!['PLANNING', 'ACTIVE'].includes(task.sprint.phase)) return res.status(400).json({ error: 'Cannot reassign cards in this phase' });
    if (role === 'INTERN') return res.status(403).json({ error: 'Interns cannot assign cards' });
    if (role === 'MENTOR' && task.sprint.cohort.mentorId !== userId) return res.status(403).json({ error: 'You do not lead this cohort' });
    const updated = await prisma.sprintTask.update({
      where: { id: req.params.id },
      data: { assignedToId: assignedToId || null },
      include: { assignedTo: { select: { id: true, name: true, internId: true } } },
    });
    const io = req.app.get('io');
    io.to(`cohort:${task.sprint.cohort.id}`).emit('task:assigned', { taskId: task.id, assignedTo: updated.assignedTo });
    if (assignedToId) {
      io.to(`cohort:${task.sprint.cohort.id}`).emit('notification:new', { type: 'TASK_ASSIGNED', message: `Card assigned to you: ${task.title}`, targetUserId: assignedToId });
    }
    res.json({ message: 'Card assigned', task: updated });
  } catch (err) {
    console.error('💥 Error assigning card:', err);
    res.status(500).json({ error: 'Failed to assign card' });
  }
});

router.patch('/tasks/:id/block', verifyToken, async (req, res) => {
  try {
    const { userId, role } = req.user;
    const task = await prisma.sprintTask.findUnique({ where: { id: req.params.id }, include: { sprint: { include: { cohort: true } } } });
    if (!task) return res.status(404).json({ error: 'Card not found' });
    if (role === 'INTERN') return res.status(403).json({ error: 'Interns cannot block cards' });
    if (role === 'MENTOR' && task.sprint.cohort.mentorId !== userId) return res.status(403).json({ error: 'You do not lead this cohort' });
    const updated = await prisma.sprintTask.update({
      where: { id: req.params.id },
      data: { blocked: !task.blocked },
      include: { assignedTo: { select: { id: true, name: true } } },
    });
    const io = req.app.get('io');
    io.to(`cohort:${task.sprint.cohort.id}`).emit('task:blocked', { taskId: task.id, blocked: updated.blocked, task: updated });
    if (updated.blocked) {
      io.to(`cohort:${task.sprint.cohort.id}`).emit('notification:new', { type: 'TASK_BLOCKED', message: `🚫 Card blocked: ${task.title}`, targetUserId: null });
    }
    res.json({ message: `Card ${updated.blocked ? 'blocked' : 'unblocked'}`, task: updated });
  } catch (err) {
    console.error('💥 Error toggling block:', err);
    res.status(500).json({ error: 'Failed to update card' });
  }
});

router.delete('/tasks/:id', verifyToken, async (req, res) => {
  try {
    const { userId, role } = req.user;
    const task = await prisma.sprintTask.findUnique({ where: { id: req.params.id }, include: { sprint: { include: { cohort: true } } } });
    if (!task) return res.status(404).json({ error: 'Card not found' });
    if (!['PLANNING', 'ACTIVE'].includes(task.sprint.phase)) return res.status(400).json({ error: 'Cards can only be deleted during Planning or Active phase' });
    if (role === 'INTERN') return res.status(403).json({ error: 'Interns cannot delete cards' });
    if (role === 'MENTOR' && task.sprint.cohort.mentorId !== userId) return res.status(403).json({ error: 'You do not lead this cohort' });
    await prisma.sprintTask.delete({ where: { id: req.params.id } });
    const io = req.app.get('io');
    io.to(`cohort:${task.sprint.cohort.id}`).emit('task:deleted', { taskId: task.id });
    res.json({ message: 'Card deleted' });
  } catch (err) {
    console.error('💥 Error deleting card:', err);
    res.status(500).json({ error: 'Failed to delete card' });
  }
});

// ════════════════════════════════════════════════════════════════════
// AI CODE REVIEW
// ════════════════════════════════════════════════════════════════════

router.post('/tasks/:id/code-submit', verifyToken, requireRole('INTERN'), async (req, res) => {
  try {
    const { code, language } = req.body;
    if (!code?.trim()) return res.status(400).json({ error: 'Code is required' });
    const task = await prisma.sprintTask.findUnique({
      where: { id: req.params.id },
      include: { sprint: { include: { cohort: true } } },
    });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (!task.isCodeTask) return res.status(400).json({ error: 'This is not a code task' });
    if (task.assignedToId !== req.user.userId) return res.status(403).json({ error: 'This task is not assigned to you' });
    if (task.sprint.phase !== 'ACTIVE') return res.status(400).json({ error: 'Sprint is not active' });

    // Execute via Piston API
    let executionOutput = '';
    let executionError = '';
    const pistonLangMap = {
      python: { language: 'python', version: '3.10.0' },
      javascript: { language: 'javascript', version: '18.15.0' },
      java: { language: 'java', version: '15.0.2' },
      cpp: { language: 'c++', version: '10.2.0' },
      c: { language: 'c', version: '10.2.0' },
      go: { language: 'go', version: '1.16.2' },
      rust: { language: 'rust', version: '1.50.0' },
      ruby: { language: 'ruby', version: '3.0.1' },
    };
    const pistonLang = pistonLangMap[language] || pistonLangMap['python'];
    try {
      const pistonRes = await fetch('https://emkc.org/api/v2/piston/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: pistonLang.language,
          version: pistonLang.version,
          files: [{ content: code }],
        }),
      });
      const pistonData = await pistonRes.json();
      executionOutput = pistonData.run?.stdout || '';
      executionError = pistonData.run?.stderr || '';
    } catch (e) {
      executionError = 'Code execution service unavailable — AI will review code only.';
    }

    // AI review via Groq
    const prompt = `You are a senior software engineer reviewing an intern's code submission.

Task: "${task.title}"
${task.description ? `Description: ${task.description}` : ''}
Language: ${language}

Code submitted:
\`\`\`${language}
${code}
\`\`\`

${executionOutput ? `Execution output:\n${executionOutput}` : ''}
${executionError ? `Execution errors:\n${executionError}` : ''}

Review this code and respond in this EXACT format (JSON only, no markdown):
{
  "verdict": "PASSED" or "FAILED",
  "score": number from 0 to 100,
  "summary": "2-3 sentence overall assessment",
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["improvement 1", "improvement 2"],
  "tip": "one practical tip for the intern"
}

PASSED if: code is correct, runs without errors, solves the task, decent code quality.
FAILED if: code has bugs, doesn't run, doesn't solve the task, or has critical issues.
Be encouraging but honest. Respond with JSON only.`;

    const aiResponse = await getGroq().chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    });

    const rawReview = aiResponse.choices[0].message.content.trim();
    let review;
    try {
      review = JSON.parse(rawReview.replace(/```json|```/g, '').trim());
    } catch {
      review = { verdict: 'FAILED', score: 0, summary: rawReview, strengths: [], improvements: [], tip: '' };
    }

    const passed = review.verdict === 'PASSED';

    const submission = await prisma.codeSubmission.create({
      data: {
        code, language,
        executionOutput: executionOutput || null,
        executionError: executionError || null,
        aiReview: JSON.stringify(review),
        aiVerdict: review.verdict,
        passed,
        taskId: task.id,
        internId: req.user.userId,
      },
    });

    if (passed) {
      // ✅ PASSED → move to REVIEW (not DONE) — mentor must approve to move to DONE
      const updatedTask = await prisma.sprintTask.update({
        where: { id: task.id },
        data: { status: 'REVIEW' },
        include: {
          assignedTo: { select: { id: true, name: true, internId: true } },
          createdBy: { select: { id: true, name: true } },
          codeSubmissions: { orderBy: { createdAt: 'desc' }, take: 1, select: { id: true, aiVerdict: true, passed: true, createdAt: true } },
        },
      });
      await takeSnapshot(task.sprintId);
      const io = req.app.get('io');
      io.to(`cohort:${task.sprint.cohort.id}`).emit('task:moved', {
        taskId: task.id, newStatus: 'REVIEW', oldStatus: task.status,
        task: updatedTask, movedBy: { id: req.user.userId, name: 'AI Review', role: 'SYSTEM' },
      });
      io.to(`cohort:${task.sprint.cohort.id}`).emit('notification:new', {
        type: 'SPRINT_PHASE',
        message: `✅ AI approved ${updatedTask.assignedTo?.name}'s code for "${task.title}" — please review and move to Done.`,
        targetUserId: null,
      });
    }

    res.json({
      passed, verdict: review.verdict, score: review.score,
      review, executionOutput, executionError, submissionId: submission.id,
    });
  } catch (err) {
    console.error('💥 Error in code review:', err);
    res.status(500).json({ error: 'Failed to review code: ' + err.message });
  }
});

router.get('/tasks/:id/code-submissions', verifyToken, requireRole('MENTOR'), async (req, res) => {
  try {
    const submissions = await prisma.codeSubmission.findMany({
      where: { taskId: req.params.id },
      orderBy: { createdAt: 'desc' },
      include: { intern: { select: { id: true, name: true, internId: true } } },
    });
    const formatted = submissions.map((s) => ({
      ...s,
      aiReview: s.aiReview ? JSON.parse(s.aiReview) : null,
    }));
    res.json({ submissions: formatted });
  } catch (err) {
    console.error('💥 Error fetching code submissions:', err);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

router.get('/tasks/:id/my-submission', verifyToken, requireRole('INTERN'), async (req, res) => {
  try {
    const submission = await prisma.codeSubmission.findFirst({
      where: { taskId: req.params.id, internId: req.user.userId },
      orderBy: { createdAt: 'desc' },
    });
    if (!submission) return res.json({ submission: null });
    res.json({
      submission: {
        ...submission,
        aiReview: submission.aiReview ? JSON.parse(submission.aiReview) : null,
      },
    });
  } catch (err) {
    console.error('💥 Error fetching submission:', err);
    res.status(500).json({ error: 'Failed to fetch submission' });
  }
});

module.exports = router;