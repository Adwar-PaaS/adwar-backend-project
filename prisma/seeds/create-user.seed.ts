import { PrismaClient, RoleName, Status } from '@prisma/client';
import { hashPassword } from '../../src/common/utils/crypto.util';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting seed...');

  let superAdminRole = await prisma.role.findFirst({
    where: { name: RoleName.SUPER_ADMIN, tenantId: null },
  });

  if (!superAdminRole) {
    console.log('Creating SUPER_ADMIN role...');
    superAdminRole = await prisma.role.create({
      data: {
        name: RoleName.SUPER_ADMIN,
        tenantId: null,
      },
    });
  }

  console.log('Creating Super Admin user...');
  const hashedPassword = await hashPassword('12341234');

  const existingUser = await prisma.user.findUnique({
    where: { email: 'superadmin@adwar.com' },
  });

  if (existingUser) {
    console.log('Super Admin user already exists, updating role...');
    await prisma.user.update({
      where: { id: existingUser.id },
      data: { roleId: superAdminRole.id },
    });
  } else {
    await prisma.user.create({
      data: {
        email: 'superadmin@adwar.com',
        password: hashedPassword,
        fullName: 'Super Administrator',
        status: Status.ACTIVE,
        roleId: superAdminRole.id,
      },
    });
    console.log('✅ Super Admin user created');
  }

  console.log('🌱 Seed completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
