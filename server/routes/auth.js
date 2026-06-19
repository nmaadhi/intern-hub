// server/routes/auth.js

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

const prisma = require('../prisma');
const { hashPassword, comparePassword } = require('../utils/password');
const { verifyToken } = require('../middleware/auth');
const { generateToken } = require('../utils/generateToken');
const { sendPasswordResetEmail } = require('../utils/email');

function validatePasswordStrength(pw) {
  if (!pw || pw.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(pw)) return 'Password must contain an uppercase letter';
  if (!/[a-z]/.test(pw)) return 'Password must contain a lowercase letter';
  if (!/\d/.test(pw)) return 'Password must contain a number';
  return null;
}

function signToken(user) {
  return jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
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
  };
}

// ─── POST /login ─── accepts email OR intern ID ──────────────────────
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Identifier (email or intern ID) and password are required' });
    }

    const isEmail = identifier.includes('@');
    const user = await prisma.user.findUnique({
      where: isEmail ? { email: identifier.toLowerCase().trim() } : { internId: identifier.trim() },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await comparePassword(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Account is not active' });
    }

    const token = signToken(user);
    res.json({ token, user: safeUser(user) });
  } catch (err) {
    console.error('💥 Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// ─── GET /me ─── current logged-in user ───────────────────────────────
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: safeUser(user) });
  } catch (err) {
    console.error('💥 /me error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ─── POST /change-password ─── requires current password (re-auth) ──
router.post('/change-password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const valid = await comparePassword(currentPassword, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const strengthError = validatePasswordStrength(newPassword);
    if (strengthError) {
      return res.status(400).json({ error: strengthError });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ error: 'New password must be different from current password' });
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

// ─── POST /forgot-password ─── request a reset link via email ────────
router.post('/forgot-password', async (req, res) => {
  try {
    const { identifier } = req.body;

    if (!identifier) {
      return res.status(400).json({ error: 'Email or intern ID is required' });
    }

    const isEmail = identifier.includes('@');
    const user = await prisma.user.findUnique({
      where: isEmail ? { email: identifier.toLowerCase().trim() } : { internId: identifier.trim() },
    });

    // Always send back the SAME response whether or not the user exists.
    // This stops attackers from using this endpoint to discover which
    // emails/intern IDs are registered (a common security leak).
    const genericResponse = {
      message: 'If an account exists for that identifier, a reset link has been sent.',
    };

    if (!user) {
      return res.json(genericResponse);
    }

    const token = generateToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    const resetLink = `http://localhost:5173/reset-password?token=${token}`;

    try {
      await sendPasswordResetEmail({ name: user.name, email: user.email, resetLink });
    } catch (err) {
      console.error('⚠️  Failed to send reset email:', err);
    }

    res.json(genericResponse);
  } catch (err) {
    console.error('💥 Forgot password error:', err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// ─── GET /reset-password/:token ─── verify a token before showing form ─
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

// ─── POST /reset-password ─── set a new password using a valid token ──
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }

    const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      return res.status(400).json({ error: 'This reset link is invalid or has expired' });
    }

    const strengthError = validatePasswordStrength(newPassword);
    if (strengthError) {
      return res.status(400).json({ error: strengthError });
    }

    const hashed = await hashPassword(newPassword);

    // Update the password AND mark the token used in one atomic transaction.
    // Either both happen, or neither does - never a half-applied state.
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

    res.json({ message: 'Password has been reset successfully. You can now log in.' });
  } catch (err) {
    console.error('💥 Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router;