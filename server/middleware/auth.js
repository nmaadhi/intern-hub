const jwt = require('jsonwebtoken');

/**
 * Middleware: checks if the request has a valid JWT.
 * - If valid → attaches user info to req.user, calls next()
 * - If invalid → returns 401
 */
function verifyToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = decoded; // { userId, role, iat, exp }
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Middleware factory: restricts a route to specific role(s).
 * Usage:
 *   requireRole('ADMIN')                  → only admins
 *   requireRole('ADMIN', 'MENTOR')        → admins OR mentors
 *
 * Must be used AFTER verifyToken (since it relies on req.user).
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
      });
    }

    next();
  };
}

module.exports = { verifyToken, requireRole };