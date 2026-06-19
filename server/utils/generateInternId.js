// server/utils/generateInternId.js
// Generates the next intern ID in INT-XXXX format.

const prisma = require('../prisma');

// Format the number with leading zeros: 1 → "0001", 23 → "0023", 542 → "0542"
function pad(num, width = 4) {
  return String(num).padStart(width, '0');
}

async function generateInternId() {
  // Find the intern with the highest internId currently in the DB.
  //
  // Since all our IDs follow the same INT-XXXX format and are zero-padded
  // to the same width, alphabetical (string) sort is identical to numeric
  // sort. So "ORDER BY internId DESC LIMIT 1" gives us the latest.
  const lastIntern = await prisma.user.findFirst({
    where: {
      role: 'INTERN',
      internId: { not: null },
    },
    orderBy: { internId: 'desc' },
    select: { internId: true },
  });

  // Start at 1 if no interns exist yet.
  let nextNum = 1;

  if (lastIntern && lastIntern.internId) {
    // Extract the number portion from "INT-0042" → 42
    const match = lastIntern.internId.match(/^INT-(\d+)$/);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }

  // Safety check: alert if we go beyond the format's range
  if (nextNum > 9999) {
    throw new Error(
      'INT-XXXX format only supports up to 9999 interns. ' +
      'Time to upgrade the ID format!'
    );
  }

  return `INT-${pad(nextNum)}`;
}

module.exports = { generateInternId };