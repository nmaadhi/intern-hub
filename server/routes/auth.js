// server/routes/auth.js

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const prisma = require('../prisma');
const { hashPassword, comparePassword } = require('../utils/password');
const { verifyToken } = require('../middleware/auth');
const { generateToken } = require('../utils/generateToken');
const { sendPasswordReset } = require('../utils/email');

function validatePasswordStrength(pw) {
  if (!pw || pw.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(pw)) return 'Password must contain an uppercase letter';
  if (!/[a-z]/.test(pw)) return 'Password must contain a lowercase letter';
  if (!/\d/.test(pw)) return 'Password must contain a number';
  return null;
}

function signToken(user) {
  return jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function safeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    internId: user.internId,
    phone: user.phone,
    role: user.role,
    status: user.status,
    mustChangePassword: user.mustChangePassword,
    cohortId: user.cohortId || null,
  };
}

// ── POST /login ───────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Identifier (email or intern ID) and password are required' });
    }

    const isEmail = identifier.includes('@');
    const user = await prisma.user.findUnique({
      where: isEmail
        ? { email: identifier.toLowerCase().trim() }
        : { internId: identifier.trim() },
    });

    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await comparePassword(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Your account has been deactivated. Contact your admin.' });
    }

    const token = signToken(user);
    res.json({ token, user: safeUser(user) });
  } catch (err) {
    console.error('💥 Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ── GET /me ───────────────────────────────────────────────────────
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: safeUser(user) });
  } catch (err) {
    console.error('💥 /me error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ── PATCH /change-password ────────────────────────────────────────
router.patch('/change-password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const valid = await comparePassword(currentPassword, user.password);
    if (!valid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ error: 'New password must be different from current password' });
    }

    const strengthError = validatePasswordStrength(newPassword);
    if (strengthError) {
      return res.status(400).json({ error: strengthError });
    }

    const hashed = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, mustChangePassword: false },
    });

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('💥 Change password error:', err);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// ── POST /forgot-password ─────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    const genericResponse = {
      message: 'If an account exists for that email, a reset link has been sent.',
    };

    if (!user) return res.json(genericResponse);

    const token = generateToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    try {
      await sendPasswordReset({
        name: user.name,
        email: user.email,
        resetToken: token,
      });
    } catch (err) {
      console.error('⚠️  Failed to send reset email:', err.message);
    }

    res.json(genericResponse);
  } catch (err) {
    console.error('💥 Forgot password error:', err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// ── GET /reset-password/:token ────────────────────────────────────
router.get('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: { select: { name: true, email: true } } },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      return res.status(400).json({ error: 'This reset link is invalid or has expired' });
    }

    res.json({ valid: true, name: resetToken.user.name, email: resetToken.user.email });
  } catch (err) {
    console.error('💥 Verify reset token error:', err);
    res.status(500).json({ error: 'Failed to verify reset link' });
  }
});

// ── POST /reset-password ──────────────────────────────────────────
// No current password needed — link from email is enough
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      return res.status(400).json({ error: 'This reset link is invalid or has expired' });
    }

    const strengthError = validatePasswordStrength(password);
    if (strengthError) {
      return res.status(400).json({ error: strengthError });
    }

    const hashed = await hashPassword(password);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { password: hashed, mustChangePassword: false },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    res.json({ message: 'Password set successfully. You can now log in.' });
  } catch (err) {
    console.error('💥 Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router;