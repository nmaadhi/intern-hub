// Import the Prisma Client class
const { PrismaClient } = require('@prisma/client');

// Create ONE instance for the whole app to share
const prisma = new PrismaClient();

// Export it so other files can use it
module.exports = prisma;