import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../db/prisma/prisma.service';
import { Prisma, User, RoleName, Status } from '@prisma/client';
import { BaseRepository } from '../../shared/factory/base.repository';
import { RedisService } from 'src/db/redis/redis.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { checkUnique } from '../../common/utils/check-unique.util';
import { sanitizeUser } from '../../common/utils/sanitize-user.util';
import { userSelector } from '../../common/selectors/user.selector';

type UserWithRelations = Prisma.UserGetPayload<{ select: typeof userSelector }>;

@Injectable()
export class UsersRepository extends BaseRepository<User> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly redis: RedisService,
  ) {
    super(
      prisma,
      redis,
      'user',
      ['email', 'firstName', 'lastName'],
      userSelector,
    );
  }

  async createUser(data: CreateUserDto): Promise<UserWithRelations> {
    await checkUnique(this.prisma, 'user', { email: data.email });

    const role = await this.prisma.role.create({
      data: {
        name: data.roleName ?? RoleName.CUSTOMER,
        tenantId: data.tenantId ?? null,
      },
    });

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: { connect: { id: role.id } },
      },
      select: userSelector,
    });

    return sanitizeUser(user) as UserWithRelations;
  }

  async createUserViaSuperAdminWithRole(
    data: CreateUserDto,
  ): Promise<UserWithRelations> {
    if (!data.tenantId) {
      throw new BadRequestException('tenantId is required');
    }

    await checkUnique(this.prisma, 'user', { email: data.email });

    if (data.roleName !== RoleName.CUSTOMER) {
      const existingRole = await this.prisma.role.findFirst({
        where: {
          name: data.roleName,
          tenantId: data.tenantId,
          deletedAt: null,
        },
      });
      if (existingRole) {
        throw new BadRequestException(
          `Role "${data.roleName}" already exists for this tenant.`,
        );
      }
    }

    const role = await this.prisma.role.create({
      data: {
        name: data.roleName,
        tenantId: data.tenantId,
      },
    });

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: { connect: { id: role.id } },
        memberships: {
          create: {
            tenantId: data.tenantId,
            ...(data.branchId ? { branchId: data.branchId } : {}),
          },
        },
      },
      select: userSelector,
    });

    return sanitizeUser(user) as UserWithRelations;
  }

  async createTenantUser(data: CreateUserDto): Promise<UserWithRelations> {
    if (!data.roleId || !data.tenantId) {
      throw new BadRequestException('roleId and tenantId are required');
    }

    await checkUnique(this.prisma, 'user', { email: data.email });

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: { connect: { id: data.roleId } },
        memberships: {
          create: {
            tenantId: data.tenantId,
            ...(data.branchId ? { branchId: data.branchId } : {}),
            ...(data.permissions
              ? {
                  permissions: {
                    create: data.permissions.map((p) => ({
                      entityType: p.entityType,
                      allowed: p.allowed ?? [],
                      denied: p.denied ?? [],
                    })),
                  },
                }
              : {}),
          },
        },
      },
      select: userSelector,
    });

    return sanitizeUser(user) as UserWithRelations;
  }

  async updateUser(
    id: string,
    data: UpdateUserDto,
  ): Promise<UserWithRelations> {
    if (data.email) {
      await checkUnique(this.prisma, 'user', { email: data.email }, id);
    }

    return this.prisma.$transaction(async (tx) => {
      const { tenantId, branchId, ...userData } = data;

      const updatedUser = await tx.user.update({
        where: { id },
        data: userData as any,
        select: userSelector,
      });

      if (tenantId) {
        await tx.userTenant.upsert({
          where: { userId_tenantId: { userId: id, tenantId } },
          update: { ...(branchId ? { branchId } : {}) },
          create: { userId: id, tenantId, ...(branchId ? { branchId } : {}) },
        });
      }

      return sanitizeUser(updatedUser) as UserWithRelations;
    });
  }

  async getByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: userSelector,
    });
  }
}

// import {
//   Injectable,
//   BadRequestException,
//   NotFoundException,
// } from '@nestjs/common';
// import { PrismaService } from '../../db/prisma/prisma.service';
// import { Prisma, User, RoleName, Status, AddressType } from '@prisma/client';
// import { BaseRepository } from '../../shared/factory/base.repository';
// import { RedisService } from 'src/db/redis/redis.service';
// import { CreateUserDto } from './dto/create-user.dto';
// import { UpdateUserDto } from './dto/update-user.dto';
// import { checkUnique } from '../../common/utils/check-unique.util';
// import { sanitizeUser } from '../../common/utils/sanitize-user.util';

// const userInclude = {
//   role: {
//     include: { permissions: true },
//   },
//   memberships: {
//     include: {
//       tenant: true,
//       permissions: true,
//     },
//   },
//   addresses: {
//     include: {
//       address: true,
//     },
//   },
// } satisfies Prisma.UserInclude;

// type UserWithRelations = Prisma.UserGetPayload<{ include: typeof userInclude }>;

// @Injectable()
// export class UsersRepository extends BaseRepository<User> {
//   constructor(
//     protected readonly prisma: PrismaService,
//     protected readonly redis: RedisService,
//   ) {
//     super(
//       prisma,
//       redis,
//       'user',
//       ['email', 'firstName', 'lastName'],
//       userInclude,
//     );
//   }

//   async createUser(data: CreateUserDto): Promise<UserWithRelations> {
//     await checkUnique(this.prisma, 'user', { email: data.email });

//     const role = await this.prisma.role.create({
//       data: {
//         name: data.roleName ?? RoleName.CUSTOMER,
//         tenantId: data.tenantId ?? null,
//       },
//     });

//     const user = await this.prisma.user.create({
//       data: {
//         email: data.email,
//         password: data.password,
//         firstName: data.firstName,
//         lastName: data.lastName,
//         phone: data.phone,
//         role: { connect: { id: role.id } },
//       },
//       include: userInclude,
//     });

//     return sanitizeUser(user) as UserWithRelations;
//   }

//   async createUserViaSuperAdminWithRole(
//     data: CreateUserDto,
//   ): Promise<UserWithRelations> {
//     if (!data.tenantId) {
//       throw new BadRequestException('tenantId are required');
//     }

//     await checkUnique(this.prisma, 'user', { email: data.email });

//     if (data.roleName !== RoleName.CUSTOMER) {
//       const existingRole = await this.prisma.role.findFirst({
//         where: {
//           name: data.roleName,
//           tenantId: data.tenantId,
//           deletedAt: null,
//         },
//       });

//       if (existingRole) {
//         throw new BadRequestException(
//           `Role "${data.roleName}" already exists for this tenant.`,
//         );
//       }
//     }

//     const role = await this.prisma.role.create({
//       data: {
//         name: data.roleName,
//         tenantId: data.tenantId,
//       },
//     });

//     const user = await this.prisma.user.create({
//       data: {
//         email: data.email,
//         password: data.password,
//         firstName: data.firstName,
//         lastName: data.lastName,
//         phone: data.phone,
//         role: { connect: { id: role.id } },
//         memberships: {
//           create: {
//             tenantId: data.tenantId,
//             ...(data.branchId ? { branchId: data.branchId } : {}),
//           },
//         },
//       },
//       include: userInclude,
//     });

//     return sanitizeUser(user) as UserWithRelations;
//   }

//   async createTenantUser(data: CreateUserDto): Promise<UserWithRelations> {
//     if (!data.roleId || !data.tenantId) {
//       throw new BadRequestException('roleId and tenantId are required');
//     }

//     await checkUnique(this.prisma, 'user', { email: data.email });

//     const user = await this.prisma.user.create({
//       data: {
//         email: data.email,
//         password: data.password,
//         firstName: data.firstName,
//         lastName: data.lastName,
//         phone: data.phone,
//         roleId: data.roleId,
//         memberships: {
//           create: {
//             tenantId: data.tenantId,
//             ...(data.branchId ? { branchId: data.branchId } : {}),
//             permissions: data.permissions
//               ? {
//                   create: data.permissions.map((p) => ({
//                     entityType: p.entityType,
//                     allowed: p.allowed ?? [],
//                     denied: p.denied ?? [],
//                   })),
//                 }
//               : undefined,
//           },
//         },
//       },
//       include: userInclude,
//     });

//     return sanitizeUser(user) as UserWithRelations;
//   }

//   async updateUser(
//     id: string,
//     data: UpdateUserDto,
//   ): Promise<UserWithRelations> {
//     if (data.email) {
//       await checkUnique(this.prisma, 'user', { email: data.email }, id);
//     }

//     return this.prisma.$transaction(async (tx) => {
//       const { tenantId, branchId, ...userData } = data;

//       const updatedUser = await tx.user.update({
//         where: { id },
//         data: userData as any,
//         include: userInclude,
//       });

//       if (tenantId) {
//         await tx.userTenant.upsert({
//           where: { userId_tenantId: { userId: id, tenantId } },
//           update: {
//             ...(branchId ? { branchId } : {}),
//           },
//           create: {
//             userId: id,
//             tenantId,
//             ...(branchId ? { branchId } : {}),
//           },
//         });
//       }

//       return sanitizeUser(updatedUser) as UserWithRelations;
//     });
//   }

//   async findById(id: string): Promise<UserWithRelations | null> {
//     return this.prisma.user.findUnique({
//       where: { id },
//       include: userInclude,
//     });
//   }

//   async getByEmail(email: string): Promise<UserWithRelations | null> {
//     return this.prisma.user.findUnique({
//       where: { email },
//       include: userInclude,
//     });
//   }

//   async getRoleByName(name: RoleName) {
//     return this.prisma.role.findFirst({ where: { name } });
//   }

//   async updateStatus(id: string, status: Status): Promise<UserWithRelations> {
//     return this.prisma.user.update({
//       where: { id },
//       data: { status },
//       include: userInclude,
//     });
//   }
// }
