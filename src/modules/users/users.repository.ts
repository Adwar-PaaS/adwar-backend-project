import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../db/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { IUser } from './interfaces/user.interface';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateUserDto): Promise<IUser> {
    return this.prisma.user.create({ data });
  }

  async findAll(): Promise<IUser[]> {
    return this.prisma.user.findMany();
  }

  async findById(id: string): Promise<IUser> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, data: UpdateUserDto): Promise<IUser> {
    return this.prisma.user.update({ where: { id }, data });
  }

  async delete(id: string): Promise<IUser> {
    return this.prisma.user.delete({ where: { id } });
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }
}
