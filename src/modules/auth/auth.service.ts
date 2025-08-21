import { Injectable, HttpStatus } from '@nestjs/common';
import { ApiError } from '../../common/exceptions/api-error.exception';
import { hashPassword, comparePasswords } from '../../common/utils/crypto.util';
import { RoleName } from '@prisma/client';
import { AuthUser } from './interfaces/auth-user.interface';
import { AuthRepository } from './auth.repository';

function mapPrismaUserToAuthUser(user: any): AuthUser {
  if (!user) {
    throw new ApiError('User not found', HttpStatus.NOT_FOUND);
  }

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    isOwner: user.memberships?.[0]?.isOwner ?? false,
    role: {
      id: user.role?.id,
      name: user.role?.name,
      permissions:
        user.role?.permissions?.map((p: any) => ({
          entity: p.entityType,
          action: p.actionType,
        })) ?? [],
    },
    tenant: user.memberships?.[0]
      ? {
          id: user.memberships[0].tenant.id,
          slug: user.memberships[0].tenant.slug,
        }
      : undefined,
  };
}

@Injectable()
export class AuthService {
  constructor(private readonly authRepo: AuthRepository) {}

  async register(dto: { email: string; password: string; fullName?: string }) {
    const existing = await this.authRepo.findUserByEmail(dto.email);
    if (existing) {
      throw new ApiError('Email already in use', HttpStatus.CONFLICT);
    }

    const hashed = await hashPassword(dto.password);

    const customerRole = await this.authRepo['usersRepo'].getRoleByName(
      RoleName.CUSTOMER,
    );
    if (!customerRole) {
      throw new ApiError(
        'Default role not found',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const created = await this.authRepo.createUser({
      email: dto.email,
      password: hashed,
      fullName: dto.fullName,
      roleId: customerRole.id,
    });

    return mapPrismaUserToAuthUser(created);
  }

  async login(email: string, password: string) {
    const user = await this.authRepo.findUserByEmail(email);
    if (!user || !(await comparePasswords(password, user.password))) {
      throw new ApiError('Invalid credentials', HttpStatus.UNAUTHORIZED);
    }

    return mapPrismaUserToAuthUser(user);
  }

  async getCurrentUser(userId: string) {
    const user = await this.authRepo.findUserById(userId);
    if (!user) throw new ApiError('User not found', HttpStatus.UNAUTHORIZED);
    return mapPrismaUserToAuthUser(user);
  }
}
