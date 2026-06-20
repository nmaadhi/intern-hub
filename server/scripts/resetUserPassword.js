const prisma = require('../prisma');
const { hashPassword } = require('../utils/password');

async function main() {
  const email = 'aathihtya2310690@ssn.edu.in'; // ← change this
  const newPassword = 'TempPass123';

  const hashed = await hashPassword(newPassword);
  await prisma.user.update({
    where: { email },
    data: { password: hashed, mustChangePassword: true },
  });

  console.log(`✅ Password reset to: ${newPassword}`);
}

main().finally(() => prisma.$disconnect());