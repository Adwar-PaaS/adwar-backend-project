import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../db/prisma/prisma.service';
import { User } from '@prisma/client';
import { BaseRepository } from '../../shared/factory/base.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { IUser } from './interfaces/user.interface';
import { USER_SAFE_SELECT } from '../../common/utils/constants.util';
import { checkEmailUnique } from '../../common/utils/check-email.util';

@Injectable()
export class UsersRepository extends BaseRepository<User> {
  constructor(private readonly prismaService: PrismaService) {
    super(prismaService, prismaService.user);
  }

  async createUser(data: CreateUserDto): Promise<IUser> {
    await checkEmailUnique(this.prismaService, 'user', data.email);
    return this.model.create({ data, select: USER_SAFE_SELECT });
  }

  async updateUser(id: string, data: UpdateUserDto): Promise<IUser> {
    if (data.email) {
      await checkEmailUnique(this.prismaService, 'user', data.email, id);
    }
    return this.model.update({ where: { id }, data, select: USER_SAFE_SELECT });
  }

  async getById(id: string): Promise<IUser> {
    const user = await this.model.findUnique({
      where: { id },
      select: USER_SAFE_SELECT,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getByEmail(
    email: string,
  ): Promise<(IUser & { password: string }) | null> {
    return this.model.findUnique({
      where: { email },
      select: {
        ...USER_SAFE_SELECT,
        password: true,
      },
    });
  }
}
