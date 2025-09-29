import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma/prisma.service';
import { Tenant } from '@prisma/client';
import { BaseRepository } from '../../shared/factory/base.repository';
import { RedisService } from 'src/db/redis/redis.service';
import { tenantSelector } from 'src/common/selectors/tenant.selector';

@Injectable()
export class TenantRepository extends BaseRepository<Tenant> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly redis: RedisService,
  ) {
    super(prisma, 'tenant', ['name', 'email'], tenantSelector);
  }
}
