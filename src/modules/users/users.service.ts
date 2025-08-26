import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersRepository } from './users.repository';
import { hashPassword } from '../../common/utils/crypto.util';
import { CreateTenantUserDto } from './dto/create-tenant-user.dto';
import { Status } from '@prisma/client';
import { AuthUser } from '../auth/interfaces/auth-user.interface';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepo: UsersRepository) {}

  async create(dto: CreateUserDto) {
    dto.password = await hashPassword(dto.password);
    return this.usersRepo.createUser(dto);
  }

  findAll(query: Record<string, any>) {
    return this.usersRepo.findAll(query);
  }

  findById(id: string) {
    return this.usersRepo.findById(id);
  }

  async update(id: string, dto: UpdateUserDto) {
    if (dto.password) {
      dto.password = await hashPassword(dto.password);
    }
    return this.usersRepo.updateUser(id, dto);
  }

  async createTenantUser(
    dto: CreateTenantUserDto,
    authUser: AuthUser,
  ) {
    dto.password = await hashPassword(dto.password);

    if (authUser.role.name === 'SUPER_ADMIN') {
      dto.isOwner = true;
    }

    return this.usersRepo.createTenantUser(dto);
  }

  async delete(id: string): Promise<void> {
    await this.usersRepo.delete(id);
  }

  findByEmail(email: string) {
    return this.usersRepo.getByEmail(email);
  }

  async updateStatus(id: string, status: Status) {
    return this.usersRepo.updateStatus(id, status);
  }
}
