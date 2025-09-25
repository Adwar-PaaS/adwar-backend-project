import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../shared/factory/base.repository';
import { PrismaService } from 'src/db/prisma/prisma.service';
import { RedisService } from 'src/db/redis/redis.service';
import { IBranch } from './interfaces/branch.interface';

@Injectable()
export class BranchRepository extends BaseRepository<IBranch> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly redis: RedisService,
  ) {
    super(prisma, redis, 'branch', ['code', 'name'], {
      id: true,
      name: true,
      code: true,
      status: true,
      type: true,
      category: true,
      createdAt: true,
      updatedAt: true,
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      address: {
        select: {
          id: true,
          city: true,
          country: true,
        },
      },
    });
  }
}
