import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma/prisma.service';
import { BaseRepository } from 'src/shared/factory/base.repository';
import { PickUp, Prisma } from '@prisma/client';
import { RedisService } from 'src/db/redis/redis.service';

export type SafePickUp = PickUp;

@Injectable()
export class PickUpRepository extends BaseRepository<
  PickUp,
  SafePickUp,
  Prisma.PickUpDelegate
> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly redis: RedisService,
  ) {
    super(prisma, prisma.pickUp, ['code'], {
      id: true,
      pickupNumber: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
      branch: true,
      driver: true,
      address: true,
    });
  }
}
