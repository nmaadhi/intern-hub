require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const prisma = require('./prisma');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

app.set('io', io);

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'InternHub API is running', timestamp: new Date().toISOString() });
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/mentor', require('./routes/mentor'));
app.use('/api/intern', require('./routes/intern'));
app.use('/api/sprint', require('./routes/sprint'));
app.use('/api/standup', require('./routes/standup'));
app.use('/api/poll', require('./routes/poll'));
app.use('/api/announcement', require('./routes/announcement'));

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found', path: req.originalUrl });
});

app.use((err, req, res, next) => {
  console.error('💥 Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Socket.io ─────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: ${socket.id}`);

  socket.on('join:cohort', (cohortId) => {
    socket.join(`cohort:${cohortId}`);
    console.log(`   ↳ joined room cohort:${cohortId}`);
  });

  socket.on('user:online', ({ userId, cohortId }) => {
    socket.data.userId = userId;
    socket.data.cohortId = cohortId;
    if (cohortId) {
      socket.to(`cohort:${cohortId}`).emit('presence:joined', { userId });
    }
  });

  socket.on('disconnect', () => {
    const { userId, cohortId } = socket.data;
    if (cohortId) {
      socket.to(`cohort:${cohortId}`).emit('presence:left', { userId });
    }
    console.log(`🔌 Socket disconnected: ${socket.id}`);
  });
});

// ── Neon keepalive — ping every 4 min to prevent DB sleep ─────────
// Neon free tier sleeps after 5 minutes of inactivity.
// This ping keeps it awake so users don't hit cold-start delays.
setInterval(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('💓 DB keepalive OK');
  } catch (e) {
    console.warn('⚠️  DB keepalive failed (Neon may be waking):', e.message);
  }
}, 4 * 60 * 1000);

// ── Global error handlers — prevent server crash from Neon sleep ──
process.on('unhandledRejection', (reason) => {
  const msg = reason?.message || String(reason);
  if (msg.includes('P1001') || msg.includes('database') || msg.includes('ECONNREFUSED')) {
    console.warn('⚠️  DB connection error (Neon waking up) — server stays alive');
    return;
  }
  console.error('⚠️  Unhandled rejection:', msg);
});

process.on('uncaughtException', (err) => {
  if (err.code === 'P1001' || err.message?.includes('database')) {
    console.warn('⚠️  Uncaught DB error — server stays alive');
    return;
  }
  console.error('💥 Uncaught exception:', err.message);
  process.exit(1);
});

// ── Start ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`🔌 Socket.io ready`);
  console.log(`💓 Neon keepalive active (ping every 4 min)`);
});