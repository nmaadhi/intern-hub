// Import Prisma Client (to talk to the DB)
const { PrismaClient } = require('@prisma/client');
// Import bcrypt (to hash the password)
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Hash the admin password before saving (NEVER store raw passwords)
  const hashedPassword = await bcrypt.hash('admin123', 10);

  // Use upsert: create the admin if it doesn't exist, do nothing if it does.
  // This makes the script safe to re-run.
  const admin = await prisma.user.upsert({
    where: { email: 'admin@internhub.com' },
    update: {}, // If user already exists, don't change anything
    create: {
      name: 'Super Admin',
      email: 'admin@internhub.com',
      password: hashedPassword,
      role: 'ADMIN',
      status: 'active',
    },
  });

  console.log('✅ Admin created:', {
    id: admin.id,
    email: admin.email,
    role: admin.role,
  });
}

// Run main() and handle errors / disconnect properly
main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });