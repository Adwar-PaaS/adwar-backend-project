import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { BaseRepository } from '../../shared/factory/base.repository';

@Injectable()
export class WarehouseRepository extends BaseRepository<any> {
  constructor(prisma: PrismaClient) {
    super(prisma, prisma.warehouse, ['location', 'name']);
  }
}
