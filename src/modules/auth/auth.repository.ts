import { Injectable } from '@nestjs/common';
import { UsersRepository } from '../users/users.repository';

@Injectable()
export class AuthRepository {
  constructor(private readonly usersRepo: UsersRepository) {}

  async createUser(dto: any) {
    return this.usersRepo.create(dto);
  }

  async findUserByEmail(email: string) {
    return this.usersRepo.getByEmail(email);
  }

  async findUserById(userId: string) {
    return this.usersRepo.findOne(userId);
  }
}
