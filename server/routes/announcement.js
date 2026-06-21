const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { verifyToken, requireRole } = require('../middleware/auth');

// POST / — create announcement
router.post('/', verifyToken, requireRole('MENTOR'), async (req, res) => {
  try {
    const { cohortId, title, content, pinned } = req.body;

    if (!cohortId || !title || !content) {
      return res.status(400).json({ error: 'cohortId, title and content are required' });
    }

    const cohort = await prisma.cohort.findUnique({ where: { id: cohortId } });
    if (!cohort) return res.status(404).json({ error: 'Cohort not found' });
    if (cohort.mentorId !== req.user.userId) {
      return res.status(403).json({ error: 'You do not lead this cohort' });
    }

    const announcement = await prisma.announcement.create({
      data: {
        title: title.trim(),
        content: content.trim(),
        pinned: pinned || false,
        cohortId,
        createdById: req.user.userId,
      },
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    });

    const io = req.app.get('io');

    // Broadcast new announcement to cohort
    io.to(`cohort:${cohortId}`).emit('announcement:new', { announcement });

    // Notification bell alert
    io.to(`cohort:${cohortId}`).emit('notification:new', {
      type: 'ANNOUNCEMENT',
      message: `📢 ${title}`,
      targetUserId: null,
    });

    res.status(201).json({ message: 'Announcement posted', announcement });
  } catch (err) {
    console.error('💥 Error creating announcement:', err);
    res.status(500).json({ error: 'Failed to create announcement' });
  }
});

// GET /?cohortId=xxx — list announcements
router.get('/', verifyToken, async (req, res) => {
  try {
    const { cohortId } = req.query;
    if (!cohortId) return res.status(400).json({ error: 'cohortId required' });

    const announcements = await prisma.announcement.findMany({
      where: { cohortId },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      include: {
        createdBy: { select: { id: true, name: true } },
      },
    });

    res.json({ count: announcements.length, announcements });
  } catch (err) {
    console.error('💥 Error listing announcements:', err);
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

// PATCH /:id/pin — toggle pin + notify interns
router.patch('/:id/pin', verifyToken, requireRole('MENTOR'), async (req, res) => {
  try {
    const announcement = await prisma.announcement.findUnique({
      where: { id: req.params.id },
    });
    if (!announcement) return res.status(404).json({ error: 'Announcement not found' });
    if (announcement.createdById !== req.user.userId) {
      return res.status(403).json({ error: 'You did not create this announcement' });
    }

    const updated = await prisma.announcement.update({
      where: { id: req.params.id },
      data: { pinned: !announcement.pinned },
      include: { createdBy: { select: { id: true, name: true } } },
    });

    const io = req.app.get('io');

    // Broadcast pin status change so intern dashboard updates live
    io.to(`cohort:${updated.cohortId}`).emit('announcement:pinned', {
      announcement: updated,
    });

    // Notify interns when something is pinned (not unpinned)
    if (updated.pinned) {
      io.to(`cohort:${updated.cohortId}`).emit('notification:new', {
        type: 'ANNOUNCEMENT',
        message: `📌 Pinned announcement: ${updated.title}`,
        targetUserId: null,
      });
    }

    res.json({
      message: `Announcement ${updated.pinned ? 'pinned' : 'unpinned'}`,
      announcement: updated,
    });
  } catch (err) {
    console.error('💥 Error toggling pin:', err);
    res.status(500).json({ error: 'Failed to update announcement' });
  }
});

// DELETE /:id
router.delete('/:id', verifyToken, requireRole('MENTOR'), async (req, res) => {
  try {
    const announcement = await prisma.announcement.findUnique({
      where: { id: req.params.id },
    });
    if (!announcement) return res.status(404).json({ error: 'Announcement not found' });
    if (announcement.createdById !== req.user.userId) {
      return res.status(403).json({ error: 'You did not create this announcement' });
    }

    await prisma.announcement.delete({ where: { id: req.params.id } });

    // Tell interns to remove it from their dashboard
    const io = req.app.get('io');
    io.to(`cohort:${announcement.cohortId}`).emit('announcement:deleted', {
      announcementId: announcement.id,
    });

    res.json({ message: 'Announcement deleted' });
  } catch (err) {
    console.error('💥 Error deleting announcement:', err);
    res.status(500).json({ error: 'Failed to delete announcement' });
  }
});

module.exports = router;