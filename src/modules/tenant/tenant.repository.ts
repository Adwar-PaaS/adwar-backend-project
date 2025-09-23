import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma/prisma.service';
import { Tenant } from '@prisma/client';
import { BaseRepository } from '../../shared/factory/base.repository';
import { RedisService } from 'src/db/redis/redis.service';

@Injectable()
export class TenantRepository extends BaseRepository<Tenant> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly redis: RedisService,
  ) {
    super(prisma, redis, 'tenant', ['name', 'email'], {
      creator: true,
      address: true,
    });
  }
}
