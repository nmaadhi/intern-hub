// server/routes/intern.js
const express = require('express');
const router = express.Router();

const prisma = require('../prisma');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken);
router.use(requireRole('INTERN'));

// ════════════════════════════════════════════════════════════════════
// PROFILE
// ════════════════════════════════════════════════════════════════════

router.get('/me', async (req, res) => {
  try {
    const me = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true, name: true, email: true, phone: true, dob: true, college: true,
        internId: true, status: true, createdAt: true,
        mentor: { select: { id: true, name: true, email: true, phone: true } },
        cohort: { select: { id: true, name: true, description: true, status: true } },
      },
    });
    if (!me) return res.status(404).json({ error: 'User not found' });
    res.json({ profile: me });
  } catch (err) {
    console.error('💥 Error fetching intern profile:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ════════════════════════════════════════════════════════════════════
// ASSIGNMENTS
// ════════════════════════════════════════════════════════════════════

router.get('/assignments', async (req, res) => {
  try {
    const me = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { cohortId: true },
    });

    const [cohortAssignments, directAssignments] = await Promise.all([
      me.cohortId
        ? prisma.assignment.findMany({
            where: { cohortId: me.cohortId },
            orderBy: { createdAt: 'desc' },
            include: { submissions: { where: { internId: req.user.userId } } },
          })
        : [],
      prisma.assignment.findMany({
        where: { cohortId: null, recipients: { some: { internId: req.user.userId } } },
        orderBy: { createdAt: 'desc' },
        include: { submissions: { where: { internId: req.user.userId } } },
      }),
    ]);

    const format = (a, type) => {
      const mySubmission = a.submissions[0] || null;
      return {
        id: a.id, title: a.title, description: a.description,
        dueDate: a.dueDate, status: a.status, createdAt: a.createdAt, type,
        mySubmission: mySubmission ? {
          id: mySubmission.id, content: mySubmission.content,
          linkUrl: mySubmission.linkUrl, fileUrl: mySubmission.fileUrl,
          fileName: mySubmission.fileName, status: mySubmission.status,
          feedback: mySubmission.feedback, submittedAt: mySubmission.submittedAt,
          reviewedAt: mySubmission.reviewedAt,
        } : null,
      };
    };

    const all = [
      ...cohortAssignments.map((a) => format(a, 'COHORT')),
      ...directAssignments.map((a) => format(a, 'DIRECT')),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const hasNoCohort = !me.cohortId && directAssignments.length === 0;
    res.json({
      count: all.length, assignments: all,
      ...(hasNoCohort ? { _note: 'You are not assigned to a cohort yet.' } : {}),
    });
  } catch (err) {
    console.error('💥 Error listing intern assignments:', err);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

router.post('/assignments/:id/submit', async (req, res) => {
  try {
    const { id } = req.params;
    const { content, linkUrl, fileUrl, fileName } = req.body;

    if (!content && !linkUrl && !fileUrl) {
      return res.status(400).json({ error: 'Provide at least one of: text response, link, or file upload' });
    }

    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: { recipients: { where: { internId: req.user.userId } } },
    });
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

    const me = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { cohortId: true },
    });

    const isCohortMatch = assignment.cohortId && assignment.cohortId === me.cohortId;
    const isDirectRecipient = !assignment.cohortId && assignment.recipients.length > 0;

    if (!isCohortMatch && !isDirectRecipient) {
      return res.status(403).json({ error: 'This assignment is not targeted at you' });
    }
    if (assignment.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'This assignment is closed' });
    }

    const submission = await prisma.submission.upsert({
      where: { assignmentId_internId: { assignmentId: id, internId: req.user.userId } },
      update: {
        content: content?.trim() || null, linkUrl: linkUrl?.trim() || null,
        fileUrl: fileUrl || null, fileName: fileName || null,
        status: 'SUBMITTED', submittedAt: new Date(),
      },
      create: {
        assignmentId: id, internId: req.user.userId,
        content: content?.trim() || null, linkUrl: linkUrl?.trim() || null,
        fileUrl: fileUrl || null, fileName: fileName || null,
        status: 'SUBMITTED',
      },
    });

    res.json({ message: 'Submission saved successfully', submission });
  } catch (err) {
    console.error('💥 Error submitting assignment:', err);
    res.status(500).json({ error: 'Failed to submit assignment' });
  }
});

// ════════════════════════════════════════════════════════════════════
// TASKS
// ════════════════════════════════════════════════════════════════════

router.get('/tasks', async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { assignedToId: req.user.userId },
      orderBy: { createdAt: 'desc' },
      include: { createdBy: { select: { id: true, name: true } } },
    });
    res.json({ count: tasks.length, tasks });
  } catch (err) {
    console.error('💥 Error listing intern tasks:', err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

router.patch('/tasks/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['TODO', 'IN_PROGRESS', 'DONE'].includes(status)) {
      return res.status(400).json({ error: 'Status must be TODO, IN_PROGRESS, or DONE' });
    }
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.assignedToId !== req.user.userId) {
      return res.status(403).json({ error: 'This task is not assigned to you' });
    }
    const updated = await prisma.task.update({
      where: { id }, data: { status },
      include: { createdBy: { select: { id: true, name: true } } },
    });
    res.json({ message: 'Task status updated', task: updated });
  } catch (err) {
    console.error('💥 Error updating task status:', err);
    res.status(500).json({ error: 'Failed to update task status' });
  }
});

// ════════════════════════════════════════════════════════════════════
// MEETINGS
// ════════════════════════════════════════════════════════════════════

router.get('/meetings', async (req, res) => {
  try {
    const me = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { cohortId: true },
    });

    const [cohortMeetings, directMeetings] = await Promise.all([
      me.cohortId
        ? prisma.meeting.findMany({
            where: { cohortId: me.cohortId },
            orderBy: { scheduledAt: 'asc' },
            include: { createdBy: { select: { id: true, name: true } } },
          })
        : [],
      prisma.meeting.findMany({
        where: { cohortId: null, recipients: { some: { internId: req.user.userId } } },
        orderBy: { scheduledAt: 'asc' },
        include: { createdBy: { select: { id: true, name: true } } },
      }),
    ]);

    const format = (m, type) => ({
      id: m.id, title: m.title, description: m.description,
      meetingLink: m.meetingLink, scheduledAt: m.scheduledAt,
      duration: m.duration, type, mentor: m.createdBy,
      isPast: new Date(m.scheduledAt) < new Date(),
    });

    const all = [
      ...cohortMeetings.map((m) => format(m, 'COHORT')),
      ...directMeetings.map((m) => format(m, 'DIRECT')),
    ].sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));

    res.json({ count: all.length, meetings: all });
  } catch (err) {
    console.error('💥 Error listing intern meetings:', err);
    res.status(500).json({ error: 'Failed to fetch meetings' });
  }
});

// ════════════════════════════════════════════════════════════════════
// NOTES — view notes shared with me
// ════════════════════════════════════════════════════════════════════

router.get('/notes', async (req, res) => {
  try {
    const me = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { cohortId: true },
    });

    // Fetch cohort notes + direct notes in parallel
    const [cohortNotes, directNotes] = await Promise.all([
      me.cohortId
        ? prisma.note.findMany({
            where: { cohortId: me.cohortId },
            orderBy: { createdAt: 'desc' },
            include: { createdBy: { select: { id: true, name: true } } },
          })
        : [],
      prisma.note.findMany({
        where: { cohortId: null, recipients: { some: { internId: req.user.userId } } },
        orderBy: { createdAt: 'desc' },
        include: { createdBy: { select: { id: true, name: true } } },
      }),
    ]);

    const format = (n, type) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      fileUrl: n.fileUrl,
      fileName: n.fileName,
      createdAt: n.createdAt,
      type,
      mentor: n.createdBy,
    });

    const all = [
      ...cohortNotes.map((n) => format(n, 'COHORT')),
      ...directNotes.map((n) => format(n, 'DIRECT')),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ count: all.length, notes: all });
  } catch (err) {
    console.error('💥 Error listing intern notes:', err);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

module.exports = router;