const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { verifyToken, requireRole } = require('../middleware/auth');

// ── Helper: format poll with results ─────────────────────────────
async function formatPoll(poll) {
  const totalResponses = poll.responses?.length || 0;
  const options = poll.options.map((opt) => {
    const count = poll.responses?.filter((r) => r.optionId === opt.id).length || 0;
    return {
      id: opt.id,
      text: opt.text,
      order: opt.order,
      count,
      pct: totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0,
    };
  });
  return {
    id: poll.id,
    question: poll.question,
    status: poll.status,
    cohortId: poll.cohortId,
    createdAt: poll.createdAt,
    createdBy: poll.createdBy,
    options,
    totalResponses,
  };
}

// ════════════════════════════════════════════════════════════════════
// MENTOR — create + manage polls
// ════════════════════════════════════════════════════════════════════

// POST /poll — create a poll
router.post('/', verifyToken, requireRole('MENTOR'), async (req, res) => {
  try {
    const { cohortId, question, options } = req.body;

    if (!cohortId || !question || !options || options.length < 2) {
      return res.status(400).json({ error: 'cohortId, question and at least 2 options are required' });
    }
    if (options.length > 6) {
      return res.status(400).json({ error: 'Maximum 6 options allowed' });
    }

    const cohort = await prisma.cohort.findUnique({ where: { id: cohortId } });
    if (!cohort) return res.status(404).json({ error: 'Cohort not found' });
    if (cohort.mentorId !== req.user.userId) {
      return res.status(403).json({ error: 'You do not lead this cohort' });
    }

    const poll = await prisma.poll.create({
      data: {
        question: question.trim(),
        cohortId,
        createdById: req.user.userId,
        status: 'DRAFT',
        options: {
          create: options.map((text, i) => ({
            text: text.trim(),
            order: i,
          })),
        },
      },
      include: {
        options: true,
        responses: true,
        createdBy: { select: { id: true, name: true } },
      },
    });

    res.status(201).json({ message: 'Poll created', poll: await formatPoll(poll) });
  } catch (err) {
    console.error('💥 Error creating poll:', err);
    res.status(500).json({ error: 'Failed to create poll' });
  }
});

// GET /poll?cohortId=xxx — list polls for a cohort
router.get('/', verifyToken, requireRole('MENTOR'), async (req, res) => {
  try {
    const { cohortId } = req.query;
    if (!cohortId) return res.status(400).json({ error: 'cohortId required' });

    const polls = await prisma.poll.findMany({
      where: { cohortId, createdById: req.user.userId },
      orderBy: { createdAt: 'desc' },
      include: {
        options: { orderBy: { order: 'asc' } },
        responses: true,
        createdBy: { select: { id: true, name: true } },
      },
    });

    const formatted = await Promise.all(polls.map(formatPoll));
    res.json({ count: formatted.length, polls: formatted });
  } catch (err) {
    console.error('💥 Error listing polls:', err);
    res.status(500).json({ error: 'Failed to fetch polls' });
  }
});

// PATCH /poll/:id/launch — set poll to ACTIVE (launches to interns live)
router.patch('/:id/launch', verifyToken, requireRole('MENTOR'), async (req, res) => {
  try {
    const poll = await prisma.poll.findUnique({
      where: { id: req.params.id },
      include: {
        options: { orderBy: { order: 'asc' } },
        responses: true,
        createdBy: { select: { id: true, name: true } },
        cohort: { select: { id: true } },
      },
    });
    if (!poll) return res.status(404).json({ error: 'Poll not found' });
    if (poll.createdById !== req.user.userId) {
      return res.status(403).json({ error: 'You did not create this poll' });
    }

    const updated = await prisma.poll.update({
      where: { id: req.params.id },
      data: { status: 'ACTIVE' },
      include: {
        options: { orderBy: { order: 'asc' } },
        responses: true,
        createdBy: { select: { id: true, name: true } },
      },
    });

    const formatted = await formatPoll(updated);

    // Broadcast to cohort room — interns see poll instantly
    const io = req.app.get('io');
    io.to(`cohort:${poll.cohort.id}`).emit('poll:launched', { poll: formatted });

    res.json({ message: 'Poll launched', poll: formatted });
  } catch (err) {
    console.error('💥 Error launching poll:', err);
    res.status(500).json({ error: 'Failed to launch poll' });
  }
});

// PATCH /poll/:id/close — close poll
router.patch('/:id/close', verifyToken, requireRole('MENTOR'), async (req, res) => {
  try {
    const poll = await prisma.poll.findUnique({
      where: { id: req.params.id },
      include: { cohort: { select: { id: true } } },
    });
    if (!poll) return res.status(404).json({ error: 'Poll not found' });
    if (poll.createdById !== req.user.userId) {
      return res.status(403).json({ error: 'You did not create this poll' });
    }

    await prisma.poll.update({
      where: { id: req.params.id },
      data: { status: 'CLOSED' },
    });

    const io = req.app.get('io');
    io.to(`cohort:${poll.cohort.id}`).emit('poll:closed', { pollId: poll.id });

    res.json({ message: 'Poll closed' });
  } catch (err) {
    console.error('💥 Error closing poll:', err);
    res.status(500).json({ error: 'Failed to close poll' });
  }
});

// DELETE /poll/:id — delete a poll
router.delete('/:id', verifyToken, requireRole('MENTOR'), async (req, res) => {
  try {
    const poll = await prisma.poll.findUnique({ where: { id: req.params.id } });
    if (!poll) return res.status(404).json({ error: 'Poll not found' });
    if (poll.createdById !== req.user.userId) {
      return res.status(403).json({ error: 'You did not create this poll' });
    }
    await prisma.poll.delete({ where: { id: req.params.id } });
    res.json({ message: 'Poll deleted' });
  } catch (err) {
    console.error('💥 Error deleting poll:', err);
    res.status(500).json({ error: 'Failed to delete poll' });
  }
});

// ════════════════════════════════════════════════════════════════════
// INTERN — view active poll + submit answer
// ════════════════════════════════════════════════════════════════════

// GET /poll/active — get active poll for intern's cohort
router.get('/active', verifyToken, requireRole('INTERN'), async (req, res) => {
  try {
    const me = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { cohortId: true },
    });
    if (!me?.cohortId) return res.json({ poll: null });

    const poll = await prisma.poll.findFirst({
      where: { cohortId: me.cohortId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      include: {
        options: { orderBy: { order: 'asc' } },
        responses: true,
      },
    });

    if (!poll) return res.json({ poll: null });

    // Check if intern already answered
    const myResponse = poll.responses.find((r) => r.internId === req.user.userId);
    const formatted = await formatPoll(poll);

    res.json({ poll: formatted, myAnswerId: myResponse?.optionId || null });
  } catch (err) {
    console.error('💥 Error fetching active poll:', err);
    res.status(500).json({ error: 'Failed to fetch poll' });
  }
});

// POST /poll/:id/respond — intern submits answer
router.post('/:id/respond', verifyToken, requireRole('INTERN'), async (req, res) => {
  try {
    const { optionId } = req.body;
    if (!optionId) return res.status(400).json({ error: 'optionId is required' });

    const poll = await prisma.poll.findUnique({
      where: { id: req.params.id },
      include: {
        options: { orderBy: { order: 'asc' } },
        cohort: { select: { id: true } },
      },
    });
    if (!poll) return res.status(404).json({ error: 'Poll not found' });
    if (poll.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Poll is not active' });
    }

    // Validate option belongs to this poll
    const validOption = poll.options.find((o) => o.id === optionId);
    if (!validOption) return res.status(400).json({ error: 'Invalid option' });

    // Upsert response (intern can change answer while poll is active)
    await prisma.pollResponse.upsert({
      where: { pollId_internId: { pollId: poll.id, internId: req.user.userId } },
      update: { optionId },
      create: { pollId: poll.id, optionId, internId: req.user.userId },
    });

    // Get updated results
    const updatedPoll = await prisma.poll.findUnique({
      where: { id: poll.id },
      include: {
        options: { orderBy: { order: 'asc' } },
        responses: true,
        createdBy: { select: { id: true, name: true } },
      },
    });

    const formatted = await formatPoll(updatedPoll);

    // Broadcast updated results to everyone in cohort
    const io = req.app.get('io');
    io.to(`cohort:${poll.cohort.id}`).emit('poll:updated', { poll: formatted });

    res.json({ message: 'Response recorded', poll: formatted, myAnswerId: optionId });
  } catch (err) {
    console.error('💥 Error responding to poll:', err);
    res.status(500).json({ error: 'Failed to submit response' });
  }
});

module.exports = router;