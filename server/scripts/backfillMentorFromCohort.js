// server/scripts/backfillMentorFromCohort.js
// One-time script: for any intern who has a cohort with a mentor,
// but no direct mentorId yet, copy the cohort's mentor as their direct mentor.
// Run this once, right after the migration that added User.mentorId.

const prisma = require('../prisma');

async function main() {
  const interns = await prisma.user.findMany({
    where: {
      role: 'INTERN',
      mentorId: null,
      cohort: { mentorId: { not: null } },
    },
    select: {
      id: true,
      name: true,
      cohort: { select: { mentorId: true, mentor: { select: { name: true } } } },
    },
  });

  console.log(`Found ${interns.length} intern(s) to backfill.`);

  for (const intern of interns) {
    await prisma.user.update({
      where: { id: intern.id },
      data: { mentorId: intern.cohort.mentorId },
    });
    console.log(`✅ ${intern.name} -> mentor: ${intern.cohort.mentor.name}`);
  }

  console.log('Backfill complete.');
}

main()
  .catch((e) => {
    console.error('💥 Backfill failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });