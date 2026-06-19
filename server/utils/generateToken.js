// server/utils/generateToken.js
// Generates a cryptographically secure random token for
// password-reset and account-setup links.

const crypto = require('crypto');

function generateToken() {
  // 32 random bytes -> 64 hex characters. Effectively unguessable.
  return crypto.randomBytes(32).toString('hex');
}

module.exports = { generateToken };