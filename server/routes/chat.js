const express = require('express');
const router = express.Router();
const prisma = require('../prisma');
const { verifyToken } = require('../middleware/auth');

router.use(verifyToken);

// ── Helper: check if two users are allowed to chat ───────────────
async function canChat(userA, userB) {
  if (userA.role === 'ADMIN' && userB.role === 'MENTOR') return true;
  if (userA.role === 'MENTOR' && userB.role === 'ADMIN') return true;
  if (userA.role === 'MENTOR' && userB.role === 'INTERN') return userB.mentorId === userA.id;
  if (userA.role === 'INTERN' && userB.role === 'MENTOR') return userA.mentorId === userB.id;
  return false;
}

// ── GET /chat/conversations ───────────────────────────────────────
router.get('/conversations', async (req, res) => {
  try {
    const me = await prisma.user.findUnique({ where: { id: req.user.userId } });

    let contacts = [];

    if (me.role === 'ADMIN') {
      contacts = await prisma.user.findMany({
        where: { role: 'MENTOR', status: 'ACTIVE' },
        select: { id: true, name: true, email: true, role: true },
      });
    } else if (me.role === 'MENTOR') {
      const admin = await prisma.user.findFirst({
        where: { role: 'ADMIN' },
        select: { id: true, name: true, email: true, role: true },
      });
      const interns = await prisma.user.findMany({
        where: { mentorId: me.id, status: 'ACTIVE' },
        select: { id: true, name: true, email: true, role: true, internId: true },
      });
      contacts = admin ? [admin, ...interns] : interns;
    } else if (me.role === 'INTERN') {
      if (me.mentorId) {
        const mentor = await prisma.user.findUnique({
          where: { id: me.mentorId },
          select: { id: true, name: true, email: true, role: true },
        });
        if (mentor) contacts = [mentor];
      }
    }

    const conversations = await Promise.all(
      contacts.map(async (contact) => {
        const lastMessage = await prisma.message.findFirst({
          where: {
            OR: [
              { senderId: me.id, receiverId: contact.id },
              { senderId: contact.id, receiverId: me.id },
            ],
          },
          orderBy: { createdAt: 'desc' },
        });

        const unreadCount = await prisma.message.count({
          where: { senderId: contact.id, receiverId: me.id, read: false },
        });

        return {
          user: contact,
          lastMessage: lastMessage ? {
            content: lastMessage.content,
            createdAt: lastMessage.createdAt,
            isMine: lastMessage.senderId === me.id,
            delivered: lastMessage.delivered,
            read: lastMessage.read,
          } : null,
          unreadCount,
        };
      })
    );

    res.json({ conversations });
  } catch (err) {
    console.error('💥 Error fetching conversations:', err);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// ── GET /chat/:userId/messages ────────────────────────────────────
router.get('/:userId/messages', async (req, res) => {
  try {
    const me = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const other = await prisma.user.findUnique({ where: { id: req.params.userId } });

    if (!other) return res.status(404).json({ error: 'User not found' });
    const allowed = await canChat(me, other);
    if (!allowed) return res.status(403).json({ error: 'Not allowed to chat with this user' });

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: me.id, receiverId: other.id },
          { senderId: other.id, receiverId: me.id },
        ],
      },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: { id: true, name: true, role: true } },
      },
    });

    // Mark unread messages from other as read
    const unreadIds = messages
      .filter((m) => m.senderId === other.id && m.receiverId === me.id && !m.read)
      .map((m) => m.id);

    if (unreadIds.length > 0) {
      await prisma.message.updateMany({
        where: { id: { in: unreadIds } },
        data: { read: true },
      });

      // Notify sender their messages were read
      const io = req.app.get('io');
      io.to(`user:${other.id}`).emit('message:read', {
        messageIds: unreadIds,
        readBy: me.id,
      });
    }

    // Return updated messages
    const updatedMessages = messages.map((m) => ({
      ...m,
      read: unreadIds.includes(m.id) ? true : m.read,
    }));

    res.json({ messages: updatedMessages });
  } catch (err) {
    console.error('💥 Error fetching messages:', err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// ── POST /chat/:userId/send ───────────────────────────────────────
router.post('/:userId/send', async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: 'Message cannot be empty' });

    const me = await prisma.user.findUnique({ where: { id: req.user.userId } });
    const other = await prisma.user.findUnique({ where: { id: req.params.userId } });

    if (!other) return res.status(404).json({ error: 'User not found' });
    const allowed = await canChat(me, other);
    if (!allowed) return res.status(403).json({ error: 'Not allowed to chat with this user' });

    const message = await prisma.message.create({
      data: {
        content: content.trim(),
        senderId: me.id,
        receiverId: other.id,
        delivered: false,
        read: false,
      },
      include: {
        sender: { select: { id: true, name: true, role: true } },
      },
    });

    const io = req.app.get('io');

    // Send to receiver
    const receiverSockets = await io.in(`user:${other.id}`).fetchSockets();
    const receiverOnline = receiverSockets.length > 0;

    if (receiverOnline) {
      // Mark as delivered immediately
      await prisma.message.update({
        where: { id: message.id },
        data: { delivered: true },
      });
      message.delivered = true;

      io.to(`user:${other.id}`).emit('message:new', { message });

      // Tell sender it was delivered
      io.to(`user:${me.id}`).emit('message:delivered', {
        messageId: message.id,
        deliveredTo: other.id,
      });
    }

    // Send to sender's other tabs
    io.to(`user:${me.id}`).emit('message:new', { message });

    // Notify receiver via notification bell
io.to(`user:${other.id}`).emit('notification:new', {
  type: 'CHAT',
  message: `💬 ${me.name}: ${content.substring(0, 40)}${content.length > 40 ? '...' : ''}`,
  targetUserId: other.id,
});

    res.status(201).json({ message });
  } catch (err) {
    console.error('💥 Error sending message:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// ── PATCH /chat/:userId/read ──────────────────────────────────────
router.patch('/:userId/read', async (req, res) => {
  try {
    const updated = await prisma.message.findMany({
      where: {
        senderId: req.params.userId,
        receiverId: req.user.userId,
        read: false,
      },
      select: { id: true },
    });

    const ids = updated.map((m) => m.id);

    if (ids.length > 0) {
      await prisma.message.updateMany({
        where: { id: { in: ids } },
        data: { read: true },
      });

      const io = req.app.get('io');
      io.to(`user:${req.params.userId}`).emit('message:read', {
        messageIds: ids,
        readBy: req.user.userId,
      });
    }

    res.json({ message: 'Marked as read' });
  } catch (err) {
    console.error('💥 Error marking read:', err);
    res.status(500).json({ error: 'Failed to mark as read' });
  }
});

module.exports = router;