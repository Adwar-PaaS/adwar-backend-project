import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { BaseRepository } from '../../shared/factory/base.repository';
import { userWithRoleSelect } from '../../common/utils/helpers.util';

@Injectable()
export class WarehouseRepository extends BaseRepository<any> {
  constructor(prisma: PrismaClient) {
    super(prisma, prisma.warehouse, ['location', 'name']);
  }

  async getWarehouseOrders(warehouseId: string) {
    return this.prisma.order.findMany({
      where: {
        warehouseId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getWarehouseUsers(warehouseId: string) {
    return this.prisma.userTenant.findMany({
      where: {
        warehouseId,
        deletedAt: null,
      },
      include: {
        user: {
          select: userWithRoleSelect,
        },
      },
    });
  }
}
