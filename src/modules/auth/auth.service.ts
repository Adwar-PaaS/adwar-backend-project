import { Injectable, HttpStatus } from '@nestjs/common';
import { ApiError } from '../../common/exceptions/api-error.exception';
import { hashPassword, comparePasswords } from '../../common/utils/crypto.util';
import { RoleName } from '@prisma/client';
import { AuthRepository } from './auth.repository';
import { mapPrismaUserToAuthUser } from './mappers/auth.mapper';

@Injectable()
export class AuthService {
  constructor(private readonly authRepo: AuthRepository) {}

  async register(dto: {
    email: string;
    password: string;
    fullName?: string;
    phone?: string;
  }) {
    const existing = await this.authRepo.findUserByEmail(dto.email);
    if (existing) {
      throw new ApiError('Email already in use', HttpStatus.CONFLICT);
    }

    const hashed = await hashPassword(dto.password);

    const created = await this.authRepo.createUser({
      email: dto.email,
      password: hashed,
      fullName: dto.fullName,
      phone: dto.phone,
      roleName: RoleName.CUSTOMER,
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
