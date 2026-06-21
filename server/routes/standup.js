// server/routes/standup.js
const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { verifyToken, requireRole } = require('../middleware/auth');

// ── Helper: get today's date at midnight (for daily uniqueness check) ──
function todayMidnight() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function tomorrowMidnight() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

// ════════════════════════════════════════════════════════════════════
// INTERN — post standup
// ════════════════════════════════════════════════════════════════════

// POST /standup — intern submits today's standup
router.post('/', verifyToken, requireRole('INTERN'), async (req, res) => {
  try {
    const { yesterday, today, blockers, sprintId } = req.body;
    const internId = req.user.userId;

    if (!yesterday?.trim() || !today?.trim()) {
      return res.status(400).json({ error: 'Yesterday and today fields are required' });
    }

    // Check if intern already posted standup today
    const existing = await prisma.standup.findFirst({
      where: {
        internId,
        date: {
          gte: todayMidnight(),
          lte: tomorrowMidnight(),
        },
      },
    });

    let standup;

    if (existing) {
      // Update today's standup
      standup = await prisma.standup.update({
        where: { id: existing.id },
        data: {
          yesterday: yesterday.trim(),
          today: today.trim(),
          blockers: blockers?.trim() || null,
          sprintId: sprintId || null,
        },
        include: {
          intern: { select: { id: true, name: true, internId: true } },
          sprint: { select: { id: true, name: true } },
        },
      });
    } else {
      // Create new standup
      standup = await prisma.standup.create({
        data: {
          yesterday: yesterday.trim(),
          today: today.trim(),
          blockers: blockers?.trim() || null,
          internId,
          sprintId: sprintId || null,
          date: new Date(),
        },
        include: {
          intern: { select: { id: true, name: true, internId: true } },
          sprint: { select: { id: true, name: true } },
        },
      });
    }

    // Broadcast to mentor via socket
    const internProfile = await prisma.user.findUnique({
      where: { id: internId },
      select: { cohortId: true, mentorId: true },
    });

    const io = req.app.get('io');
    if (internProfile?.cohortId) {
      io.to(`cohort:${internProfile.cohortId}`).emit('standup:new', { standup });
    }

    res.status(existing ? 200 : 201).json({
      message: existing ? 'Standup updated' : 'Standup posted successfully',
      standup,
      alreadyPostedToday: !!existing,
    });
  } catch (err) {
    console.error('💥 Error posting standup:', err);
    res.status(500).json({ error: 'Failed to post standup' });
  }
});

// GET /standup/mine — intern gets their own standups
router.get('/mine', verifyToken, requireRole('INTERN'), async (req, res) => {
  try {
    const standups = await prisma.standup.findMany({
      where: { internId: req.user.userId },
      orderBy: { date: 'desc' },
      take: 7, // last 7 days
      include: {
        sprint: { select: { id: true, name: true } },
      },
    });

    // Check if already posted today
    const postedToday = standups.some((s) => {
      const d = new Date(s.date);
      const today = new Date();
      return (
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear()
      );
    });

    res.json({ standups, postedToday });
  } catch (err) {
    console.error('💥 Error fetching standups:', err);
    res.status(500).json({ error: 'Failed to fetch standups' });
  }
});

// ════════════════════════════════════════════════════════════════════
// MENTOR — view standup feed
// ════════════════════════════════════════════════════════════════════

// GET /standup/feed?cohortId=xxx&date=2026-06-21
router.get('/feed', verifyToken, requireRole('MENTOR'), async (req, res) => {
  try {
    const { cohortId, date } = req.query;

    if (!cohortId) {
      return res.status(400).json({ error: 'cohortId is required' });
    }

    // Verify mentor leads this cohort
    const cohort = await prisma.cohort.findUnique({
      where: { id: cohortId },
      include: { interns: { select: { id: true, name: true, internId: true } } },
    });
    if (!cohort) return res.status(404).json({ error: 'Cohort not found' });
    if (cohort.mentorId !== req.user.userId) {
      return res.status(403).json({ error: 'You do not lead this cohort' });
    }

    // Parse date filter (default to today)
    let targetDate = new Date();
    if (date) {
      targetDate = new Date(date);
      if (isNaN(targetDate.getTime())) {
        return res.status(400).json({ error: 'Invalid date format' });
      }
    }

    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);

    // Get standups for this cohort on the selected date
    const standups = await prisma.standup.findMany({
      where: {
        intern: { cohortId },
        date: { gte: dayStart, lte: dayEnd },
      },
      orderBy: { date: 'asc' },
      include: {
        intern: { select: { id: true, name: true, internId: true } },
        sprint: { select: { id: true, name: true } },
      },
    });

    // Show which interns haven't posted yet
    const postedInternIds = new Set(standups.map((s) => s.internId));
    const missing = cohort.interns.filter((i) => !postedInternIds.has(i.id));

    res.json({
      date: targetDate.toISOString().split('T')[0],
      cohort: { id: cohort.id, name: cohort.name },
      standups,
      missing,
      totalInterns: cohort.interns.length,
      postedCount: standups.length,
    });
  } catch (err) {
    console.error('💥 Error fetching standup feed:', err);
    res.status(500).json({ error: 'Failed to fetch standup feed' });
  }
});

module.exports = router;