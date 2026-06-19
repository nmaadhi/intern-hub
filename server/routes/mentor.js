// server/routes/mentor.js
const express = require('express');
const router = express.Router();

const prisma = require('../prisma');
const { verifyToken, requireRole } = require('../middleware/auth');

router.use(verifyToken);
router.use(requireRole('MENTOR'));

// ════════════════════════════════════════════════════════════════════
// COHORTS
// ════════════════════════════════════════════════════════════════════

router.get('/cohorts', async (req, res) => {
  try {
    const cohorts = await prisma.cohort.findMany({
      where: { mentorId: req.user.userId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { interns: true } } },
    });
    const formatted = cohorts.map((c) => ({
      id: c.id, name: c.name, description: c.description,
      startDate: c.startDate, endDate: c.endDate, status: c.status,
      internCount: c._count.interns,
    }));
    res.json({ count: formatted.length, cohorts: formatted });
  } catch (err) {
    console.error('💥 Error listing mentor cohorts:', err);
    res.status(500).json({ error: 'Failed to fetch cohorts' });
  }
});

// ════════════════════════════════════════════════════════════════════
// INTERNS
// ════════════════════════════════════════════════════════════════════

router.get('/interns', async (req, res) => {
  try {
    const interns = await prisma.user.findMany({
      where: { role: 'INTERN', mentorId: req.user.userId },
      orderBy: { internId: 'asc' },
      select: {
        id: true, name: true, email: true, phone: true, internId: true,
        status: true, mustChangePassword: true, createdAt: true,
        cohort: { select: { id: true, name: true } },
      },
    });
    res.json({ count: interns.length, interns });
  } catch (err) {
    console.error('💥 Error listing mentor interns:', err);
    res.status(500).json({ error: 'Failed to fetch interns' });
  }
});

// ════════════════════════════════════════════════════════════════════
// ASSIGNMENTS
// ════════════════════════════════════════════════════════════════════

router.post('/assignments', async (req, res) => {
  try {
    const { cohortId, internIds, title, description, dueDate } = req.body;
    if (!cohortId && (!internIds || internIds.length === 0)) {
      return res.status(400).json({ error: 'Provide either a cohortId or internIds' });
    }
    if (cohortId && internIds && internIds.length > 0) {
      return res.status(400).json({ error: 'Provide either cohortId or internIds, not both' });
    }
    if (!title) return res.status(400).json({ error: 'Title is required' });
    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 3 || trimmedTitle.length > 150) {
      return res.status(400).json({ error: 'Title must be 3 to 150 characters' });
    }
    let parsedDueDate = null;
    if (dueDate) {
      parsedDueDate = new Date(dueDate);
      if (isNaN(parsedDueDate.getTime())) return res.status(400).json({ error: 'Invalid due date' });
    }
    if (cohortId) {
      const cohort = await prisma.cohort.findUnique({ where: { id: cohortId } });
      if (!cohort) return res.status(404).json({ error: 'Cohort not found' });
      if (cohort.mentorId !== req.user.userId) return res.status(403).json({ error: 'You do not lead this cohort' });
      if (cohort.status !== 'ACTIVE') return res.status(400).json({ error: `Cannot create assignments for a ${cohort.status} cohort` });
      const assignment = await prisma.assignment.create({
        data: { title: trimmedTitle, description: description?.trim() || null, dueDate: parsedDueDate, cohortId, createdById: req.user.userId },
      });
      return res.status(201).json({ message: 'Cohort assignment created', assignment: { ...assignment, type: 'COHORT' } });
    }
    const interns = await prisma.user.findMany({
      where: { id: { in: internIds }, role: 'INTERN', mentorId: req.user.userId },
      select: { id: true },
    });
    if (interns.length !== internIds.length) {
      return res.status(403).json({ error: 'One or more interns are not directly assigned to you' });
    }
    const assignment = await prisma.$transaction(async (tx) => {
      const a = await tx.assignment.create({
        data: { title: trimmedTitle, description: description?.trim() || null, dueDate: parsedDueDate, cohortId: null, createdById: req.user.userId },
      });
      await tx.assignmentRecipient.createMany({ data: internIds.map((internId) => ({ assignmentId: a.id, internId })) });
      return a;
    });
    res.status(201).json({ message: 'Direct assignment created', assignment: { ...assignment, type: 'DIRECT', recipientCount: internIds.length } });
  } catch (err) {
    console.error('💥 Error creating assignment:', err);
    res.status(500).json({ error: 'Failed to create assignment' });
  }
});

router.get('/assignments', async (req, res) => {
  try {
    const assignments = await prisma.assignment.findMany({
      where: {
        OR: [
          { cohort: { mentorId: req.user.userId } },
          { cohortId: null, createdById: req.user.userId },
        ],
      },
      orderBy: { createdAt: 'desc' },
      include: {
        cohort: { select: { id: true, name: true, _count: { select: { interns: true } } } },
        recipients: { select: { intern: { select: { id: true, name: true } } } },
        submissions: { select: { status: true } },
      },
    });
    const formatted = assignments.map((a) => {
      const isCohort = !!a.cohortId;
      const totalInterns = isCohort ? a.cohort._count.interns : a.recipients.length;
      const submitted = a.submissions.length;
      const approved = a.submissions.filter((s) => s.status === 'APPROVED').length;
      const needsRevision = a.submissions.filter((s) => s.status === 'NEEDS_REVISION').length;
      return {
        id: a.id, title: a.title, description: a.description, dueDate: a.dueDate,
        status: a.status, createdAt: a.createdAt,
        type: isCohort ? 'COHORT' : 'DIRECT',
        cohort: isCohort ? { id: a.cohort.id, name: a.cohort.name } : null,
        recipients: isCohort ? [] : a.recipients.map((r) => r.intern),
        totalInterns, submittedCount: submitted, approvedCount: approved, needsRevisionCount: needsRevision,
      };
    });
    res.json({ count: formatted.length, assignments: formatted });
  } catch (err) {
    console.error('💥 Error listing assignments:', err);
    res.status(500).json({ error: 'Failed to fetch assignments' });
  }
});

router.get('/assignments/:id/submissions', async (req, res) => {
  try {
    const { id } = req.params;
    const assignment = await prisma.assignment.findUnique({
      where: { id },
      include: {
        cohort: { include: { interns: { select: { id: true, name: true, internId: true, email: true } } } },
        recipients: { include: { intern: { select: { id: true, name: true, internId: true, email: true } } } },
        submissions: true,
      },
    });
    if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
    const isCohortAssignment = !!assignment.cohortId;
    if (isCohortAssignment && assignment.cohort.mentorId !== req.user.userId) {
      return res.status(403).json({ error: 'You do not lead this cohort' });
    }
    if (!isCohortAssignment && assignment.createdById !== req.user.userId) {
      return res.status(403).json({ error: 'You did not create this assignment' });
    }
    const internList = isCohortAssignment
      ? assignment.cohort.interns
      : assignment.recipients.map((r) => r.intern);
    const submissionByIntern = new Map(assignment.submissions.map((s) => [s.internId, s]));
    const rows = internList.map((intern) => {
      const sub = submissionByIntern.get(intern.id);
      return {
        intern: { id: intern.id, name: intern.name, internId: intern.internId, email: intern.email },
        submission: sub ? {
          id: sub.id, content: sub.content, linkUrl: sub.linkUrl,
          fileUrl: sub.fileUrl, fileName: sub.fileName,
          status: sub.status, feedback: sub.feedback,
          submittedAt: sub.submittedAt, reviewedAt: sub.reviewedAt,
        } : null,
      };
    });
    res.json({
      assignment: { id: assignment.id, title: assignment.title, description: assignment.description, dueDate: assignment.dueDate, status: assignment.status, type: isCohortAssignment ? 'COHORT' : 'DIRECT' },
      count: rows.length, submissions: rows,
    });
  } catch (err) {
    console.error('💥 Error fetching submissions:', err);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

router.patch('/submissions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, feedback } = req.body;
    if (!['APPROVED', 'NEEDS_REVISION'].includes(status)) {
      return res.status(400).json({ error: 'Status must be APPROVED or NEEDS_REVISION' });
    }
    const submission = await prisma.submission.findUnique({
      where: { id },
      include: { assignment: { include: { cohort: true } } },
    });
    if (!submission) return res.status(404).json({ error: 'Submission not found' });
    if (submission.assignment.cohortId) {
      if (submission.assignment.cohort.mentorId !== req.user.userId) {
        return res.status(403).json({ error: 'You do not lead this cohort' });
      }
    } else {
      if (submission.assignment.createdById !== req.user.userId) {
        return res.status(403).json({ error: 'You did not create this assignment' });
      }
    }
    const updated = await prisma.submission.update({
      where: { id },
      data: { status, feedback: feedback?.trim() || null, reviewedAt: new Date() },
    });
    res.json({ message: 'Submission reviewed successfully', submission: updated });
  } catch (err) {
    console.error('💥 Error reviewing submission:', err);
    res.status(500).json({ error: 'Failed to review submission' });
  }
});

// ════════════════════════════════════════════════════════════════════
// TASKS
// ════════════════════════════════════════════════════════════════════

router.post('/tasks', async (req, res) => {
  try {
    const { assignedToId, title, description, dueDate } = req.body;
    if (!assignedToId || !title) {
      return res.status(400).json({ error: 'assignedToId and title are required' });
    }
    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 2 || trimmedTitle.length > 150) {
      return res.status(400).json({ error: 'Title must be 2 to 150 characters' });
    }
    const intern = await prisma.user.findUnique({ where: { id: assignedToId } });
    if (!intern) return res.status(404).json({ error: 'Intern not found' });
    if (intern.role !== 'INTERN') return res.status(400).json({ error: 'User is not an intern' });
    if (intern.mentorId !== req.user.userId) {
      return res.status(403).json({ error: 'This intern is not directly assigned to you' });
    }
    let parsedDueDate = null;
    if (dueDate) {
      parsedDueDate = new Date(dueDate);
      if (isNaN(parsedDueDate.getTime())) return res.status(400).json({ error: 'Invalid due date' });
    }
    const task = await prisma.task.create({
      data: { title: trimmedTitle, description: description?.trim() || null, dueDate: parsedDueDate, assignedToId, createdById: req.user.userId },
      include: { assignedTo: { select: { id: true, name: true, internId: true } } },
    });
    res.status(201).json({ message: 'Task created successfully', task });
  } catch (err) {
    console.error('💥 Error creating task:', err);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

router.get('/tasks', async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      where: { createdById: req.user.userId },
      orderBy: { createdAt: 'desc' },
      include: { assignedTo: { select: { id: true, name: true, internId: true } } },
    });
    res.json({ count: tasks.length, tasks });
  } catch (err) {
    console.error('💥 Error listing tasks:', err);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

router.patch('/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, dueDate } = req.body;
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.createdById !== req.user.userId) {
      return res.status(403).json({ error: 'You did not create this task' });
    }
    const updateData = {};
    if (title !== undefined) {
      const trimmedTitle = title.trim();
      if (trimmedTitle.length < 2 || trimmedTitle.length > 150) {
        return res.status(400).json({ error: 'Title must be 2 to 150 characters' });
      }
      updateData.title = trimmedTitle;
    }
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (status !== undefined) {
      if (!['TODO', 'IN_PROGRESS', 'DONE'].includes(status)) {
        return res.status(400).json({ error: 'Status must be TODO, IN_PROGRESS, or DONE' });
      }
      updateData.status = status;
    }
    if (dueDate !== undefined) {
      if (!dueDate) { updateData.dueDate = null; }
      else {
        const parsed = new Date(dueDate);
        if (isNaN(parsed.getTime())) return res.status(400).json({ error: 'Invalid due date' });
        updateData.dueDate = parsed;
      }
    }
    const updated = await prisma.task.update({
      where: { id }, data: updateData,
      include: { assignedTo: { select: { id: true, name: true, internId: true } } },
    });
    res.json({ message: 'Task updated successfully', task: updated });
  } catch (err) {
    console.error('💥 Error updating task:', err);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

router.delete('/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (task.createdById !== req.user.userId) {
      return res.status(403).json({ error: 'You did not create this task' });
    }
    await prisma.task.delete({ where: { id } });
    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    console.error('💥 Error deleting task:', err);
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// ════════════════════════════════════════════════════════════════════
// MEETINGS
// ════════════════════════════════════════════════════════════════════

router.post('/meetings', async (req, res) => {
  try {
    const { title, description, meetingLink, scheduledAt, duration, cohortId, internIds } = req.body;
    if (!title || !meetingLink || !scheduledAt) {
      return res.status(400).json({ error: 'title, meetingLink, and scheduledAt are required' });
    }
    if (!cohortId && (!internIds || internIds.length === 0)) {
      return res.status(400).json({ error: 'Provide either a cohortId or internIds' });
    }
    if (cohortId && internIds && internIds.length > 0) {
      return res.status(400).json({ error: 'Provide either cohortId or internIds, not both' });
    }
    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 2 || trimmedTitle.length > 150) {
      return res.status(400).json({ error: 'Title must be 2 to 150 characters' });
    }
    const parsedDate = new Date(scheduledAt);
    if (isNaN(parsedDate.getTime())) return res.status(400).json({ error: 'Invalid scheduledAt date' });
    try { new URL(meetingLink); } catch { return res.status(400).json({ error: 'meetingLink must be a valid URL' }); }
    if (cohortId) {
      const cohort = await prisma.cohort.findUnique({ where: { id: cohortId } });
      if (!cohort) return res.status(404).json({ error: 'Cohort not found' });
      if (cohort.mentorId !== req.user.userId) return res.status(403).json({ error: 'You do not lead this cohort' });
      const meeting = await prisma.meeting.create({
        data: { title: trimmedTitle, description: description?.trim() || null, meetingLink: meetingLink.trim(), scheduledAt: parsedDate, duration: duration ? parseInt(duration) : null, cohortId, createdById: req.user.userId },
        include: { cohort: { select: { id: true, name: true } } },
      });
      return res.status(201).json({ message: 'Meeting created for cohort', meeting: { ...meeting, type: 'COHORT' } });
    }
    const interns = await prisma.user.findMany({
      where: { id: { in: internIds }, role: 'INTERN', mentorId: req.user.userId },
      select: { id: true },
    });
    if (interns.length !== internIds.length) {
      return res.status(403).json({ error: 'One or more interns are not directly assigned to you' });
    }
    const meeting = await prisma.$transaction(async (tx) => {
      const m = await tx.meeting.create({
        data: { title: trimmedTitle, description: description?.trim() || null, meetingLink: meetingLink.trim(), scheduledAt: parsedDate, duration: duration ? parseInt(duration) : null, cohortId: null, createdById: req.user.userId },
      });
      await tx.meetingRecipient.createMany({ data: internIds.map((internId) => ({ meetingId: m.id, internId })) });
      return m;
    });
    res.status(201).json({ message: 'Meeting created for selected interns', meeting: { ...meeting, type: 'DIRECT', recipientCount: internIds.length } });
  } catch (err) {
    console.error('💥 Error creating meeting:', err);
    res.status(500).json({ error: 'Failed to create meeting' });
  }
});

router.get('/meetings', async (req, res) => {
  try {
    const meetings = await prisma.meeting.findMany({
      where: { createdById: req.user.userId },
      orderBy: { scheduledAt: 'asc' },
      include: {
        cohort: { select: { id: true, name: true } },
        recipients: { include: { intern: { select: { id: true, name: true, internId: true } } } },
      },
    });
    const formatted = meetings.map((m) => ({
      id: m.id, title: m.title, description: m.description, meetingLink: m.meetingLink,
      scheduledAt: m.scheduledAt, duration: m.duration, createdAt: m.createdAt,
      type: m.cohortId ? 'COHORT' : 'DIRECT',
      cohort: m.cohort || null,
      recipients: m.cohortId ? [] : m.recipients.map((r) => r.intern),
      isPast: new Date(m.scheduledAt) < new Date(),
    }));
    res.json({ count: formatted.length, meetings: formatted });
  } catch (err) {
    console.error('💥 Error listing meetings:', err);
    res.status(500).json({ error: 'Failed to fetch meetings' });
  }
});

router.delete('/meetings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const meeting = await prisma.meeting.findUnique({ where: { id } });
    if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
    if (meeting.createdById !== req.user.userId) {
      return res.status(403).json({ error: 'You did not create this meeting' });
    }
    await prisma.meeting.delete({ where: { id } });
    res.json({ message: 'Meeting cancelled successfully' });
  } catch (err) {
    console.error('💥 Error deleting meeting:', err);
    res.status(500).json({ error: 'Failed to cancel meeting' });
  }
});

// ════════════════════════════════════════════════════════════════════
// NOTES — share content/files with cohort or specific interns
// ════════════════════════════════════════════════════════════════════

// POST /notes — create a note
router.post('/notes', async (req, res) => {
  try {
    const { title, content, fileUrl, fileName, cohortId, internIds } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (!content && !fileUrl) {
      return res.status(400).json({ error: 'Provide text content, a file, or both' });
    }
    if (!cohortId && (!internIds || internIds.length === 0)) {
      return res.status(400).json({ error: 'Provide either a cohortId or internIds' });
    }
    if (cohortId && internIds && internIds.length > 0) {
      return res.status(400).json({ error: 'Provide either cohortId or internIds, not both' });
    }

    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 2 || trimmedTitle.length > 150) {
      return res.status(400).json({ error: 'Title must be 2 to 150 characters' });
    }

    if (cohortId) {
      const cohort = await prisma.cohort.findUnique({ where: { id: cohortId } });
      if (!cohort) return res.status(404).json({ error: 'Cohort not found' });
      if (cohort.mentorId !== req.user.userId) {
        return res.status(403).json({ error: 'You do not lead this cohort' });
      }

      const note = await prisma.note.create({
        data: {
          title: trimmedTitle,
          content: content?.trim() || null,
          fileUrl: fileUrl || null,
          fileName: fileName || null,
          cohortId,
          createdById: req.user.userId,
        },
        include: { cohort: { select: { id: true, name: true } } },
      });

      return res.status(201).json({ message: 'Note shared with cohort', note: { ...note, type: 'COHORT' } });
    }

    // Direct — validate interns
    const interns = await prisma.user.findMany({
      where: { id: { in: internIds }, role: 'INTERN', mentorId: req.user.userId },
      select: { id: true },
    });
    if (interns.length !== internIds.length) {
      return res.status(403).json({ error: 'One or more interns are not directly assigned to you' });
    }

    const note = await prisma.$transaction(async (tx) => {
      const n = await tx.note.create({
        data: {
          title: trimmedTitle,
          content: content?.trim() || null,
          fileUrl: fileUrl || null,
          fileName: fileName || null,
          cohortId: null,
          createdById: req.user.userId,
        },
      });
      await tx.noteRecipient.createMany({
        data: internIds.map((internId) => ({ noteId: n.id, internId })),
      });
      return n;
    });

    res.status(201).json({
      message: 'Note shared with selected interns',
      note: { ...note, type: 'DIRECT', recipientCount: internIds.length },
    });
  } catch (err) {
    console.error('💥 Error creating note:', err);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// GET /notes — list all notes I created
router.get('/notes', async (req, res) => {
  try {
    const notes = await prisma.note.findMany({
      where: { createdById: req.user.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        cohort: { select: { id: true, name: true } },
        recipients: { include: { intern: { select: { id: true, name: true, internId: true } } } },
      },
    });

    const formatted = notes.map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      fileUrl: n.fileUrl,
      fileName: n.fileName,
      createdAt: n.createdAt,
      type: n.cohortId ? 'COHORT' : 'DIRECT',
      cohort: n.cohort || null,
      recipients: n.cohortId ? [] : n.recipients.map((r) => r.intern),
    }));

    res.json({ count: formatted.length, notes: formatted });
  } catch (err) {
    console.error('💥 Error listing notes:', err);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// DELETE /notes/:id — remove a note
router.delete('/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const note = await prisma.note.findUnique({ where: { id } });
    if (!note) return res.status(404).json({ error: 'Note not found' });
    if (note.createdById !== req.user.userId) {
      return res.status(403).json({ error: 'You did not create this note' });
    }
    await prisma.note.delete({ where: { id } });
    res.json({ message: 'Note deleted successfully' });
  } catch (err) {
    console.error('💥 Error deleting note:', err);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

module.exports = router;