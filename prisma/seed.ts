import { PrismaClient, RoleName, Status } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Start seeding...');

  // 1. Seed roles (system-level, tenantId = null)
  const roles = Object.values(RoleName);
  for (const role of roles) {
    await prisma.role.upsert({
      where: {
        tenantId_name: { tenantId: null, name: role },
      },
      update: {},
      create: {
        name: role,
        tenantId: null, // system role
      },
    });
  }
  console.log('✅ Roles seeded');

  // 2. Create SUPERADMIN user (system-level)
  const superAdminRole = await prisma.role.findUniqueOrThrow({
    where: {
      tenantId_name: { tenantId: null, name: RoleName.SUPERADMIN },
    },
  });

  const passwordHash = await bcrypt.hash('SuperAdmin@123', 10);

  await prisma.user.upsert({
    where: { email: 'superadmin@example.com' },
    update: {},
    create: {
      email: 'superadmin@example.com',
      fullName: 'System Super Admin',
      password: passwordHash,
      status: Status.Activate,
      roleId: superAdminRole.id,
    },
  });

  console.log('✅ SUPERADMIN user created (email: superadmin@example.com / pass: SuperAdmin@123)');

  console.log('🌱 Seeding finished!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


// import { PrismaClient, EntityType, ActionType } from '@prisma/client';

// const prisma = new PrismaClient();

// async function main() {
//   console.log('🌱 Start seeding permissions...');

//   const entities = Object.values(EntityType);
//   const actions = Object.values(ActionType);

//   for (const entity of entities) {
//     for (const action of actions) {
//       await prisma.permission.upsert({
//         where: {
//           entity_action: {
//             entity,
//             action,
//           },
//         },
//         update: {},
//         create: {
//           entity,
//           action,
//         },
//       });
//     }
//   }

//   console.log('✅ Permissions seeded successfully');
// }

// main()
//   .catch((e) => {
//     console.error(e);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });


// import { PrismaClient } from '@prisma/client';
// import { hashPassword } from '../src/common/utils/crypto.util';

// const prisma = new PrismaClient();

// async function main() {
//   const password = 'x123456789';
//   const hashedPassword = await hashPassword(password);

//   await prisma.user.upsert({
//     where: { email: 'x@adwar.com' },
//     update: {},
//     create: {
//       email: 'x@adwar.com',
//       password: hashedPassword,
//       fullName: 'X Admin',
//       role: 'SUPERADMIN',
//     },
//   });

//   console.log('Seeded SUPERADMIN');
// }

// main()
//   .catch((e) => {
//     console.error('Seed error:', e);
//     process.exit(1);
//   })
//   .finally(() => prisma.$disconnect());
