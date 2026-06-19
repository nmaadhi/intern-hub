const { PrismaClient } = require('@prisma/client');
const { hashPassword } = require('../utils/password');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const hashedPassword = await hashPassword('admin123');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@internhub.com' },
    update: {
      password: hashedPassword,
      mustChangePassword: false,
    },
    create: {
      name: 'Admin User',
      email: 'admin@internhub.com',
      password: hashedPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
      mustChangePassword: false,
    },
  });

  console.log('✅ Admin ready:', {
    id: admin.id,
    email: admin.email,
    role: admin.role,
  });

  console.log('\n📝 Login credentials:');
  console.log('   Email:    admin@internhub.com');
  console.log('   Password: admin123');
  console.log('\nAll mentors, cohorts, and interns will be created via the admin UI.\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });