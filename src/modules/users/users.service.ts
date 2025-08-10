import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersRepository } from './users.repository';
import { IUser } from './interfaces/user.interface';
import { hashPassword } from '../../common/utils/crypto.util';

@Injectable()
export class UsersService {
  constructor(private readonly userRepo: UsersRepository) {}

  async create(dto: CreateUserDto): Promise<IUser> {
    dto.password = await hashPassword(dto.password);
    return this.userRepo.create(dto);
  }

  findAll(): Promise<IUser[]> {
    return this.userRepo.findAll();
  }

  findById(id: string): Promise<IUser> {
    return this.userRepo.findById(id);
  }

  async update(id: string, dto: UpdateUserDto): Promise<IUser> {
    if (dto.password) {
      dto.password = await hashPassword(dto.password);
    }
    return this.userRepo.update(id, dto);
  }

  delete(id: string): Promise<IUser> {
    return this.userRepo.delete(id);
  }

  findByEmail(email: string): Promise<IUser | null> {
    return this.userRepo.findByEmail(email);
  }
}
