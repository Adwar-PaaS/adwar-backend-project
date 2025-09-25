import { Injectable } from '@nestjs/common';
import { UsersRepository } from '../users/users.repository';
import { Prisma } from '@prisma/client';
import { AttachUserToTenantDto } from '../users/dto/attach-user-to-tenant.dto';

@Injectable()
export class AuthRepository {
  constructor(public readonly usersRepo: UsersRepository) {}

  async createUser(dto: any) {
    return this.usersRepo.createUser(dto);
  }

  // async attachUserToTenant(dto: AttachUserToTenantDto) {
  //   return this.usersRepo.attachUserToTenant(dto);
  // }

  async findUserByEmail(email: string) {
    return this.usersRepo.getByEmail(email);
  }

  async findUserById(userId: string) {
    return this.usersRepo.findOne({ userId });
  }

  async findOne(where: Prisma.UserWhereUniqueInput) {
    return this.usersRepo.findOne(where);
  }
}
