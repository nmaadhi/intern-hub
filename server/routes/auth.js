// ───── Imports ─────
const express = require('express');
const jwt = require('jsonwebtoken');
const prisma = require('../prisma');
const { hashPassword, comparePassword } = require('../utils/password');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// ───────────────────────────────────────────────────────────
// POST /login
// Body: { identifier, password }
//   - identifier = email OR internId
// Returns: { token, user } on success
// ───────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // 1. Validate input
    if (!identifier || !password) {
      return res.status(400).json({
        error: 'Identifier (email or intern ID) and password are required',
      });
    }

    // 2. Find user by email OR internId
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier },
          { internId: identifier },
        ],
      },
    });

    // 3. Generic error (prevents user enumeration)
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 4. Block inactive accounts
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    // 5. Verify password
    const passwordMatches = await comparePassword(password, user.password);
    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 6. Generate JWT
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // 7. Send token + safe user info (no password hash)
    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        internId: user.internId,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Something went wrong' });
  }
});

// ───────────────────────────────────────────────────────────
// GET /me
// Returns info about the currently logged-in user.
// Requires: valid JWT in Authorization header
// ───────────────────────────────────────────────────────────
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        name: true,
        email: true,
        internId: true,
        role: true,
        status: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user });
  } catch (error) {
    console.error('GET /me error:', error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// ───────────────────────────────────────────────────────────
// POST /change-password
// Lets a logged-in user change their own password.
// Body: { currentPassword, newPassword }
// Requires: valid JWT
// ───────────────────────────────────────────────────────────
router.post('/change-password', verifyToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // 1. Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: 'Current password and new password are required',
      });
    }

    // 2. Password strength
    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'New password must be at least 8 characters long',
      });
    }

    // 3. Block reusing the same password
    if (currentPassword === newPassword) {
      return res.status(400).json({
        error: 'New password must be different from the current password',
      });
    }

    // 4. Fetch user (we need the current hashed password)
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // 5. Verify current password (re-authentication)
    const currentPasswordMatches = await comparePassword(
      currentPassword,
      user.password
    );
    if (!currentPasswordMatches) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // 6. Hash the new password
    const newHashedPassword = await hashPassword(newPassword);

    // 7. Save the new hash
    await prisma.user.update({
      where: { id: user.id },
      data: { password: newHashedPassword },
    });

    // 8. Success
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

module.exports = router;