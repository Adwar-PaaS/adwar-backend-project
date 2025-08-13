import { Injectable, HttpStatus } from '@nestjs/common';
import { UsersRepository } from '../users/users.repository';
import { ApiError } from '../../common/exceptions/api-error.exception';
import { hashPassword, comparePasswords } from '../../common/utils/crypto.util';
import { sanitizeUser } from '../../common/utils/sanitize-user.util';

@Injectable()
export class AuthService {
  constructor(private readonly usersRepo: UsersRepository) {}

  async register(dto: { email: string; password: string; name?: string }) {
    const existing = await this.usersRepo.getByEmail(dto.email);
    if (existing) {
      throw new ApiError('Email already in use', HttpStatus.CONFLICT);
    }
    const hashed = await hashPassword(dto.password);
    const created = await this.usersRepo.create({ ...dto, password: hashed });
    return sanitizeUser(created);
  }

  async login(email: string, password: string) {
    const user = await this.usersRepo.getByEmail(email);
    if (!user || !(await comparePasswords(password, user.password))) {
      throw new ApiError('Invalid credentials', HttpStatus.UNAUTHORIZED);
    }
    return sanitizeUser(user);
  }

  async getCurrentUser(userId: string) {
    const user = await this.usersRepo.findOne(userId);
    if (!user) throw new ApiError('User not found', HttpStatus.UNAUTHORIZED);
    return sanitizeUser(user);
  }
}
