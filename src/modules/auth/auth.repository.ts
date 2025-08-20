import { Injectable } from '@nestjs/common';
import { UsersRepository } from '../users/users.repository';
import { Prisma } from '@prisma/client';

@Injectable()
export class AuthRepository {
  constructor(public readonly usersRepo: UsersRepository) {}

  async createUser(dto: any) {
    return this.usersRepo.createUser(dto);
  }

  async findUserByEmail(email: string) {
    return this.usersRepo.getByEmail(email);
  }

  async findUserById(userId: string) {
    return this.usersRepo.findById(userId);
  }

  async findOne(where: Prisma.UserWhereUniqueInput) {
    return this.usersRepo.findOne(where);
  }
}
