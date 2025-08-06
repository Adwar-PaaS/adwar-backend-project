import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const password = 'x123456789';
  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email: 'x@adwar.com' },
    update: {},
    create: {
      email: 'x@adwar.com',
      password: hashedPassword,
      fullName: 'X Admin',
      role: 'SUPERADMIN',
    },
  });

  console.log('Seeded SUPERADMIN');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
