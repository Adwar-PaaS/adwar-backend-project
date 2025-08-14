import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma/prisma.service';
import { User } from '@prisma/client';
import { BaseRepository } from '../../shared/factory/base.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { checkEmailUnique } from '../../common/utils/check-email.util';

@Injectable()
export class UsersRepository extends BaseRepository<User> {
  constructor(private readonly prismaService: PrismaService) {
    super(prismaService, prismaService.user, ['email', 'fullName', 'role']);
  }

  async createUser(data: CreateUserDto): Promise<User> {
    await checkEmailUnique(this.prismaService, 'user', data.email);
    return this.create(data);
  }

  async updateUser(id: string, data: UpdateUserDto): Promise<User> {
    if (data.email) {
      await checkEmailUnique(this.prismaService, 'user', data.email, id);
    }
    return this.update(id, data);
  }

  async getById(id: string): Promise<User> {
    return this.findOne(id);
  }

  async getByEmail(email: string): Promise<User | null> {
    return this.model.findUnique({ where: { email } });
  }
}
