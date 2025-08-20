import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma/prisma.service';
import { Prisma, User, RoleName, Status } from '@prisma/client';
import { BaseRepository } from '../../shared/factory/base.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { checkEmailUnique } from '../../common/utils/check-email.util';

const userInclude = {
  role: {
    include: {
      permissions: true,
    },
  },
  memberships: {
    include: {
      tenant: true,
      warehouse: true,
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
    return this.prisma.user.create({
      data: {
        email: data.email,
        password: (data as any).password,
        fullName: data.fullName,
        phone: data.phone ?? null,
        roleId: data.roleId,
      },
      include: this.getUserInclude(),
    });
  }

  async createTenantUser(data: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    roleId: string;
    tenantId: string;
    isOwner?: boolean;
    warehouseId?: string | null;
  }): Promise<UserWithRelations> {
    await checkEmailUnique(this.prisma, 'user', data.email);

    return this.prisma.user.create({
      data: {
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        phone: data.phone,
        roleId: data.roleId,
        memberships: {
          create: {
            tenantId: data.tenantId,
            isOwner: data.isOwner ?? false,
            ...(data.warehouseId ? { warehouseId: data.warehouseId } : {}),
          },
        },
      },
      include: this.getUserInclude(),
    });
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
