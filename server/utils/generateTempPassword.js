// server/utils/generateTempPassword.js
// Generates a cryptographically-secure random password.
// Guarantees at least one uppercase, lowercase, digit, and special char.

const crypto = require('crypto');

function generateTempPassword(length = 12) {
  // Character pools — note: we exclude lookalike chars (0/O, 1/l/I) to avoid
  // confusion when a human reads or types it.
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '!@#$%&*';
  const all = upper + lower + digits + special;

  // Helper: securely pick one random char from a string
  const pick = (str) => str[crypto.randomInt(str.length)];

  // Step 1: ensure at least one from each category (satisfies password rules)
  let password = pick(upper) + pick(lower) + pick(digits) + pick(special);

  // Step 2: fill the rest from the full pool
  for (let i = 4; i < length; i++) {
    password += pick(all);
  }

  // Step 3: shuffle so the required chars aren't always at the start
  const arr = password.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join('');
}

module.exports = { generateTempPassword };