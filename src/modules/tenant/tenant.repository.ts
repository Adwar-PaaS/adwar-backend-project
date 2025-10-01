import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma/prisma.service';
import { Prisma, Tenant } from '@prisma/client';
import { BaseRepository } from '../../shared/factory/base.repository';
import { RedisService } from 'src/db/redis/redis.service';
import { tenantSelector } from 'src/common/selectors/tenant.selector';

export type SafeTenant = Tenant;

@Injectable()
export class TenantRepository extends BaseRepository<
  Tenant,
  SafeTenant,
  Prisma.TenantDelegate
> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly redis: RedisService,
  ) {
    super(prisma, prisma.tenant, ['name', 'email'], tenantSelector);
  }
}
