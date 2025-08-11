import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersRepository } from './users.repository';
import { IUser } from './interfaces/user.interface';
import { hashPassword } from '../../common/utils/crypto.util';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepo: UsersRepository) {}

  async create(dto: CreateUserDto): Promise<IUser> {
    dto.password = await hashPassword(dto.password);
    return this.usersRepo.createUser(dto);
  }

  findAll(query: Record<string, any>) {
    return this.usersRepo.findAll(query);
  }

  findById(id: string) {
    return this.usersRepo.getById(id);
  }

  async update(id: string, dto: UpdateUserDto) {
    if (dto.password) {
      dto.password = await hashPassword(dto.password);
    }
    return this.usersRepo.updateUser(id, dto);
  }

  async delete(id: string): Promise<{ success: boolean }> {
    await this.usersRepo.delete(id);
    return { success: true };
  }

  findByEmail(email: string) {
    return this.usersRepo.getByEmail(email);
  }
}
