// Import bcrypt - the password hashing library
const bcrypt = require('bcrypt');

// Number of salt rounds (10 is standard, secure + fast enough)
const SALT_ROUNDS = 10;

/**
 * Hash a plain-text password before storing it in the database.
 * @param {string} plainPassword - The raw password from the user
 * @returns {Promise<string>} - The hashed password (safe to store)
 */
async function hashPassword(plainPassword) {
  return await bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/**
 * Compare a plain-text password against a stored hash.
 * Used during login to check if the password matches.
 * @param {string} plainPassword - The password the user just typed
 * @param {string} hashedPassword - The hash stored in the database
 * @returns {Promise<boolean>} - true if match, false if not
 */
async function comparePassword(plainPassword, hashedPassword) {
  return await bcrypt.compare(plainPassword, hashedPassword);
}

// Export both functions so other files can use them
module.exports = {
  hashPassword,
  comparePassword,
};