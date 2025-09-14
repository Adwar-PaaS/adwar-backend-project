import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma/prisma.service';
import { Tenant } from '@prisma/client';
import { BaseRepository } from '../../shared/factory/base.repository';

@Injectable()
export class TenantRepository extends BaseRepository<Tenant> {
  constructor(private readonly prismaService: PrismaService) {
    super(prismaService, prismaService.tenant, ['name', 'email'], {
      creator: true,
      address: true,
    });
  }
}
