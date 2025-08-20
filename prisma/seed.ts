// seed-superadmin.ts
import { PrismaClient, RoleName, Status, EntityType, ActionType } from '@prisma/client';
import { hashPassword } from '../src/common/utils/crypto.util'; // Adjust path as needed

const prisma = new PrismaClient();

async function seedSuperAdmin() {
  try {
    console.log('Starting superadmin seeding...');

    // 1. First, ensure all permissions exist
    console.log('Seeding permissions...');
    const entities = Object.values(EntityType);
    const actions = Object.values(ActionType);
    
    for (const entity of entities) {
      for (const action of actions) {
        await prisma.permission.upsert({
          where: {
            entity_action: {
              entity,
              action,
            },
          },
          update: {},
          create: {
            entity,
            action,
          },
        });
      }
    }
    console.log('Permissions seeded successfully');

    // 2. Create or get SUPERADMIN role
    console.log('Creating SUPERADMIN role...');
    let superAdminRole = await prisma.role.findFirst({
      where: { name: RoleName.SUPERADMIN },
    });

    if (!superAdminRole) {
      superAdminRole = await prisma.role.create({
        data: { name: RoleName.SUPERADMIN },
      });
      console.log('SUPERADMIN role created');
    } else {
      console.log('SUPERADMIN role already exists');
    }

    // 3. Get all permissions
    const allPermissions = await prisma.permission.findMany();
    
    // 4. Assign all permissions to SUPERADMIN role
    console.log('Assigning permissions to SUPERADMIN role...');
    for (const permission of allPermissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: superAdminRole.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId: superAdminRole.id,
          permissionId: permission.id,
        },
      });
    }
    console.log('All permissions assigned to SUPERADMIN role');

    // 5. Create superadmin user
    console.log('Creating superadmin user...');
    const hashedPassword = await hashPassword('12341234');
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'superadmin@adwar.com' },
    });

    if (existingUser) {
      console.log('Superadmin user already exists, updating role...');
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
          status: Status.Activate,
          roleId: superAdminRole.id,
        },
      });
    }
    console.log('Superadmin user created/updated successfully');

    console.log('Superadmin seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding superadmin:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script if this file is executed directly
if (require.main === module) {
  seedSuperAdmin()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { seedSuperAdmin };

// import { PrismaClient, RoleName, Status, EntityType, ActionType } from '@prisma/client';
// import * as bcrypt from 'bcrypt';

// const prisma = new PrismaClient();

// async function main() {
//   await prisma.$connect();
//   console.log('🌱 Start seeding...');

//   // 1. Seed all basic permissions first
//   console.log('Creating permissions...');
//   const entities = Object.values(EntityType);
//   const actions = Object.values(ActionType);

//   for (const entity of entities) {
//     for (const action of actions) {
//       await prisma.permission.upsert({
//         where: {
//           entity_action: { entity, action },
//         },
//         update: {},
//         create: { entity, action },
//       });
//     }
//   }
//   console.log('✅ Permissions seeded');

//   // 2. Seed roles (system-level, tenantId = null)
//   console.log('Creating roles...');
//   const roles = Object.values(RoleName);
//   for (const role of roles) {
//     const existingRole = await prisma.role.findFirst({
//       where: {
//         name: role,
//         tenantId: null,
//       },
//     });

//     if (!existingRole) {
//       const createdRole = await prisma.role.create({
//         data: {
//           name: role,
//           tenantId: null, // system role
//         },
//       });

//       // Add default permissions for specific roles
//       if (role === RoleName.SUPERADMIN) {
//         // SUPERADMIN gets all permissions for all entities
//         const allPermissions = await prisma.permission.findMany();

//         for (const permission of allPermissions) {
//           await prisma.rolePermission.upsert({
//             where: {
//               roleId_permissionId: {
//                 roleId: createdRole.id,
//                 permissionId: permission.id,
//               },
//             },
//             update: {},
//             create: {
//               roleId: createdRole.id,
//               permissionId: permission.id,
//             },
//           });
//         }
//         console.log(`✅ SUPERADMIN role created with all permissions`);
//       }

//       // Add basic permissions for CUSTOMER
//       if (role === RoleName.CUSTOMER) {
//         const customerPermissions = await prisma.permission.findMany({
//           where: {
//             OR: [
//               { entity: EntityType.CUSTOMER_ORDERS, action: ActionType.CREATE },
//               { entity: EntityType.CUSTOMER_ORDERS, action: ActionType.VIEW },
//               { entity: EntityType.CUSTOMER_ORDERS, action: ActionType.RETRIEVE },
//             ],
//           },
//         });

//         for (const permission of customerPermissions) {
//           await prisma.rolePermission.upsert({
//             where: {
//               roleId_permissionId: {
//                 roleId: createdRole.id,
//                 permissionId: permission.id,
//               },
//             },
//             update: {},
//             create: {
//               roleId: createdRole.id,
//               permissionId: permission.id,
//             },
//           });
//         }
//         console.log(`✅ CUSTOMER role created with order permissions`);
//       }
//     }
//   }
//   console.log('✅ Roles seeded');

//   // 3. Create SUPERADMIN user (system-level)
//   console.log('Creating SUPERADMIN user...');
//   const superAdminRole = await prisma.role.findFirst({
//     where: {
//       name: RoleName.SUPERADMIN,
//       tenantId: null,
//     },
//   });

//   if (!superAdminRole) {
//     throw new Error('SUPERADMIN role not found');
//   }

//   const passwordHash = await bcrypt.hash('SuperAdmin@123', 10);

//   await prisma.user.upsert({
//     where: { email: 'superadmin@example.com' },
//     update: {},
//     create: {
//       email: 'superadmin@example.com',
//       fullName: 'System Super Admin',
//       password: passwordHash,
//       status: Status.Activate,
//       roleId: superAdminRole.id,
//     },
//   });

//   console.log('✅ SUPERADMIN user created (email: superadmin@example.com / pass: SuperAdmin@123)');
//   console.log('🌱 Seeding finished!');
// }

// main()
//   .catch((e) => {
//     console.error('Seed error:', e);
//     process.exit(1);
//   })
//   .finally(async () => {
//     await prisma.$disconnect();
//   });
