/* eslint-disable @typescript-eslint/no-require-imports */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD;

  const existingAdmin = await prisma.user.findUnique({
    where: { username: adminUsername },
  });

  if (!existingAdmin) {
    if (!adminPassword || adminPassword.length < 12) {
      throw new Error('Set ADMIN_PASSWORD to a strong password with at least 12 characters before seeding.');
    }
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.create({
      data: {
        firstName: 'Super',
        lastName: 'Admin',
        username: adminUsername,
        passwordHash,
        role: 'SUPER_ADMIN',
        mustChangePassword: false,
      },
    });
    console.log(`Created admin user: ${adminUsername}`);
  } else {
    console.log('Admin user already exists');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
