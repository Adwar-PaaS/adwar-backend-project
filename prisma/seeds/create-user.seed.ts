import { PrismaClient, RoleName, Status, AddressType } from '@prisma/client';
import { hashPassword } from '../../src/common/utils/crypto.util';

const prisma = new PrismaClient();

async function seed() {
  console.log('🚀 Starting create-user seed...');

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

  let superAdmin = await prisma.user.findUnique({
    where: { email: 'superadmin@adwar.com' },
  });

  if (superAdmin) {
    console.log('Super Admin user already exists, updating role...');
    superAdmin = await prisma.user.update({
      where: { id: superAdmin.id },
      data: { roleId: superAdminRole.id },
    });
  } else {
    superAdmin = await prisma.user.create({
      data: {
        email: 'superadmin@adwar.com',
        password: hashedPassword,
        firstName: 'Super',
        lastName: 'Administrator',
        businessType: null,
        status: Status.ACTIVE,
        roleId: superAdminRole.id,
      },
    });
    console.log('✅ Super Admin user created');
  }

  console.log('Creating Super Admin address...');
  const address = await prisma.address.create({
    data: {
      label: 'Head Office',
      address1: '123 Main Street',
      city: 'Cairo',
      country: 'Egypt',
    },
  });

  await prisma.userAddress.create({
    data: {
      userId: superAdmin.id,
      addressId: address.id,
      type: AddressType.OFFICE,
      isPrimary: true,
    },
  });

  console.log('✅ Address assigned to Super Admin');
  console.log('🌱 create-user seed completed');
}

export default seed;
