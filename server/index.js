// ───── Load environment variables FIRST (before any other code) ─────
require('dotenv').config();

// ───── Imports ─────
const express = require('express');
const cors = require('cors');

// Route files
const authRoutes = require('./routes/auth');

// ───── Setup ─────
const app = express();

// Middleware: parse JSON request bodies
app.use(express.json());

// Middleware: allow cross-origin requests (React on :5173 → Express on :5000)
app.use(cors());

// ───── Routes ─────
app.get('/', (req, res) => {
  res.json({ message: 'InternHub backend is running 🚀' });
});

// Mount the auth router under /api/auth
// So: routes/auth.js → POST /login   becomes   POST /api/auth/login
app.use('/api/auth', authRoutes);

// ───── Start server ─────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});