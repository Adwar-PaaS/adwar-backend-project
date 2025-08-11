import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../db/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { IUser } from './interfaces/user.interface';
import { USER_SAFE_SELECT } from '../../common/utils/constants.util';
import { checkEmailUnique } from '../../common/utils/check-email.util';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateUserDto): Promise<IUser> {
    await checkEmailUnique(this.prisma, 'user', data.email);

    return this.prisma.user.create({
      data,
      select: USER_SAFE_SELECT,
    });
  }

  async findAll(): Promise<IUser[]> {
    return this.prisma.user.findMany({
      select: USER_SAFE_SELECT,
    });
  }

  async findById(id: string): Promise<IUser> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_SAFE_SELECT,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, data: UpdateUserDto): Promise<IUser> {
    if (data.email) {
      await checkEmailUnique(this.prisma, 'user', data.email, id);
    }

    return this.prisma.user.update({
      where: { id },
      data,
      select: USER_SAFE_SELECT,
    });
  }

  async delete(id: string): Promise<IUser> {
    return this.prisma.user.delete({
      where: { id },
      select: USER_SAFE_SELECT,
    });
  }

  async findByEmail(
    email: string,
  ): Promise<(IUser & { password: string }) | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        ...USER_SAFE_SELECT,
        password: true,
      },
    });
  }
}
