import { Injectable, HttpStatus } from '@nestjs/common';
import { UsersRepository } from '../users/users.repository';
import { ApiError } from '../../common/exceptions/api-error.exception';
import { hashPassword, comparePasswords } from '../../common/utils/crypto.util';
import { RoleName } from '@prisma/client';
import { AuthUser } from './interfaces/auth-user.interface';

function mapPrismaUserToAuthUser(user: any): AuthUser {
  const permissions =
    user?.role?.rolePermissions?.map((rp) => rp.permission) ?? [];

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: {
      id: user.role.id,
      name: user.role.name,
      permissions: permissions.map((p: any) => ({
        entity: p.entity,
        action: p.action,
      })),
    },
    userTenants:
      user.userTenants?.map((ut: any) => ({
        tenantId: ut.tenantId,
        isOwner: ut.isOwner,
      })) ?? [],
  };
}

@Injectable()
export class AuthService {
  constructor(private readonly usersRepo: UsersRepository) {}

  async register(dto: { email: string; password: string; fullName?: string }) {
    const existing = await this.usersRepo.getByEmail(dto.email);
    if (existing) {
      throw new ApiError('Email already in use', HttpStatus.CONFLICT);
    }
    const hashed = await hashPassword(dto.password);

    const customerRole = await this.usersRepo.getRoleByName(RoleName.CUSTOMER);
    if (!customerRole) {
      throw new ApiError(
        'Default role not found',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const created = await this.usersRepo.create({
      email: dto.email,
      password: hashed,
      fullName: dto.fullName,
      roleId: customerRole.id,
    });

    return mapPrismaUserToAuthUser(created);
  }

  async login(email: string, password: string) {
    const user = await this.usersRepo.getByEmail(email);
    if (!user || !(await comparePasswords(password, user.password))) {
      throw new ApiError('Invalid credentials', HttpStatus.UNAUTHORIZED);
    }

    return mapPrismaUserToAuthUser(user);
  }

  async getCurrentUser(userId: string) {
    const user = await this.usersRepo.findOne(userId);
    if (!user) throw new ApiError('User not found', HttpStatus.UNAUTHORIZED);
    return mapPrismaUserToAuthUser(user);
  }
}
