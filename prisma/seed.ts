import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { email: 'x@test.com' },
    update: {},
    create: {
      email: 'x@test.com',
      password: 'x123456789',
      fullName: 'X Admin',
      role: 'SUPERADMIN',
    },
  });

  console.log('Seeded SUPERADMIN');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
