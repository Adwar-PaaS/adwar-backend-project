import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersRepository } from './users.repository';
import { IUser } from './interfaces/user.interface';

@Injectable()
export class UsersService {
  constructor(private readonly userRepo: UsersRepository) {}

  create(dto: CreateUserDto): Promise<IUser> {
    return this.userRepo.create(dto);
  }

  findAll(): Promise<IUser[]> {
    return this.userRepo.findAll();
  }

  findById(id: string): Promise<IUser> {
    return this.userRepo.findById(id);
  }

  update(id: string, dto: UpdateUserDto): Promise<IUser> {
    return this.userRepo.update(id, dto);
  }

  delete(id: string): Promise<IUser> {
    return this.userRepo.delete(id);
  }

  findByEmail(email: string): Promise<IUser | null> {
    return this.userRepo.findByEmail(email);
  }
}
