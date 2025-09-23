import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma/prisma.service';
import { BaseRepository } from 'src/shared/factory/base.repository';
import { PickUp } from '@prisma/client';
import { RedisService } from 'src/db/redis/redis.service';

@Injectable()
export class PickUpRepository extends BaseRepository<PickUp> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly redis: RedisService,
  ) {
    super(prisma, redis, 'pickUp', ['code'], {
      branch: true,
      driver: true,
      address: true,
    });
  }
}
