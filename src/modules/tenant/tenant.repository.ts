import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma/prisma.service';
import { Tenant } from '@prisma/client';
import { BaseRepository } from '../../shared/factory/base.repository';

@Injectable()
export class TenantRepository extends BaseRepository<Tenant> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma, prisma.tenant, ['name', 'email'], {
      creator: true,
      address: true,
    });
  }
}
