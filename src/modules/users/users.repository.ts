import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma/prisma.service';
import { User, RoleName } from '@prisma/client';
import { BaseRepository } from '../../shared/factory/base.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { checkEmailUnique } from '../../common/utils/check-email.util';

@Injectable()
export class UsersRepository extends BaseRepository<User> {
  constructor(private readonly prisma: PrismaService) {
    super(prisma, prisma.user, ['email', 'fullName', 'role']);
  }

  async create(data: {
    email: string;
    password: string;
    fullName?: string;
    phone?: string | null;
    roleId: string;
  }): Promise<User> {
    await checkEmailUnique(this.prisma, 'user', data.email);
    return this.prisma.user.create({
      data,
      include: {
        role: {
          include: { rolePermissions: { include: { permission: true } } },
        },
        userTenants: true,
      },
    });
  }

  async createUser(data: CreateUserDto): Promise<User> {
    await checkEmailUnique(this.prisma, 'user', data.email);
    return this.create({
      email: data.email,
      password: (data as any).password,
      fullName: data.fullName,
      phone: data.phone ?? null,
      roleId: data.roleId,
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
  }): Promise<User> {
    await checkEmailUnique(this.prisma, 'user', data.email);

    return this.prisma.user.create({
      data: {
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        phone: data.phone,
        roleId: data.roleId,
        userTenants: {
          create: {
            tenantId: data.tenantId,
            isOwner: data.isOwner ?? false,
          },
        },
      },
      include: {
        role: {
          include: { rolePermissions: { include: { permission: true } } },
        },
        userTenants: true,
      },
    });
  }

  async updateUser(id: string, data: UpdateUserDto): Promise<User> {
    if (data.email) {
      await checkEmailUnique(this.prisma, 'user', data.email, id);
    }
    return this.prisma.user.update({
      where: { id },
      data,
      include: {
        role: {
          include: { rolePermissions: { include: { permission: true } } },
        },
        userTenants: true,
      },
    });
  }

  async findOne(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        role: {
          include: { rolePermissions: { include: { permission: true } } },
        },
        userTenants: true,
      },
    });
  }

  async getByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        role: {
          include: { rolePermissions: { include: { permission: true } } },
        },
        userTenants: true,
      },
    });
  }

  async getRoleByName(name: RoleName) {
    return this.prisma.role.findFirst({ where: { name } });
  }

  async updateStatus(id: string, status: string) {
    return this.prisma.user.update({
      where: { id },
      data: { status },
      include: {
        role: {
          include: { rolePermissions: { include: { permission: true } } },
        },
        userTenants: true,
      },
    });
  }
}
