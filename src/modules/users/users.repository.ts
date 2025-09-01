import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma/prisma.service';
import {
  Prisma,
  User,
  RoleName,
  Status,
  EntityType,
  ActionType,
} from '@prisma/client';
import { BaseRepository } from '../../shared/factory/base.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { checkEmailUnique } from '../../common/utils/check-email.util';
import { sanitizeUser } from '../../common/utils/sanitize-user.util';

const userInclude = {
  role: true,
  memberships: {
    include: {
      tenant: true,
      warehouse: true,
      permissions: true,
    },
  },
} satisfies Prisma.UserInclude;

type UserWithRelations = Prisma.UserGetPayload<{ include: typeof userInclude }>;

@Injectable()
export class UsersRepository extends BaseRepository<User> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma, prisma.user, ['email', 'fullName', 'role']);
  }

  private getUserInclude() {
    return userInclude;
  }

  async createUser(data: CreateUserDto): Promise<UserWithRelations> {
    await checkEmailUnique(this.prisma, 'user', data.email);

    const role = await this.prisma.role.create({
      data: {
        name: data.roleName,
        tenantId: data.tenantId ?? null,
      },
    });

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        phone: data.phone,
        role: {
          connect: { id: role.id },
        },
      },
      include: this.getUserInclude(),
    });

    return sanitizeUser(user) as UserWithRelations;
  }

  async createUserViaSuperAdminWithRole(data: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    tenantId: string;
    roleName: RoleName;
    warehouseId?: string | null;
  }): Promise<UserWithRelations> {
    await checkEmailUnique(this.prisma, 'user', data.email);

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
        fullName: data.fullName,
        phone: data.phone,
        role: {
          connect: { id: role.id },
        },
        memberships: {
          create: {
            tenantId: data.tenantId,
            ...(data.warehouseId ? { warehouseId: data.warehouseId } : {}),
          },
        },
      },
      include: this.getUserInclude(),
    });

    return sanitizeUser(user) as UserWithRelations;
  }

  async createTenantUser(data: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    roleId: string;
    tenantId: string;
    warehouseId?: string | null;
    permissions?: { entityType: EntityType; actionType: ActionType[] }[];
  }): Promise<UserWithRelations> {
    await checkEmailUnique(this.prisma, 'user', data.email);

    const hasCustomPermissions =
      data.permissions && data.permissions.length > 0;

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        phone: data.phone,
        roleId: data.roleId,
        memberships: {
          create: {
            tenantId: data.tenantId,
            ...(data.warehouseId ? { warehouseId: data.warehouseId } : {}),
            permissions: hasCustomPermissions
              ? {
                  create: data.permissions!.map((p) => ({
                    entityType: p.entityType,
                    actionType: p.actionType,
                  })),
                }
              : undefined,
          },
        },
      },
      include: this.getUserInclude(),
    });

    return sanitizeUser(user) as UserWithRelations;
  }

  async updateUser(
    id: string,
    data: UpdateUserDto,
  ): Promise<UserWithRelations> {
    if (data.email) {
      await checkEmailUnique(this.prisma, 'user', data.email, id);
    }
    return this.prisma.user.update({
      where: { id },
      data,
      include: this.getUserInclude(),
    });
  }

  async findById(id: string): Promise<UserWithRelations | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: this.getUserInclude(),
    });
  }

  async getByEmail(email: string): Promise<UserWithRelations | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: this.getUserInclude(),
    });
  }

  async getRoleByName(name: RoleName) {
    return this.prisma.role.findFirst({ where: { name } });
  }

  async updateStatus(id: string, status: Status): Promise<UserWithRelations> {
    return this.prisma.user.update({
      where: { id },
      data: { status },
      include: this.getUserInclude(),
    });
  }
}
