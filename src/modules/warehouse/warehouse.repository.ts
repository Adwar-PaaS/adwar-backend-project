import { Injectable } from '@nestjs/common';
import { PrismaClient, Status, OrderStatus, RoleName } from '@prisma/client';
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

  async getAvaliableDriversInWarehouse(warehouseId: string) {
    const memberships = await this.prisma.userTenant.findMany({
      where: {
        warehouseId,
        deletedAt: null,
        user: {
          status: Status.ACTIVE,
          role: { name: RoleName.DRIVER },
          orders: { none: { status: OrderStatus.OUT_FOR_DELIVERY } },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            status: true,
          },
        },
      },
    });

    return memberships.map((m) => m.user);
  }

  async getWarehouseUsersDrivers(warehouseId: string) {
    return this.prisma.userTenant.findMany({
      where: {
        warehouseId,
        deletedAt: null,
        user: {
          role: {
            name: RoleName.DRIVER,
          },
        },
      },
      include: {
        user: {
          select: userWithRoleSelect,
        },
      },
    });
  }
}
