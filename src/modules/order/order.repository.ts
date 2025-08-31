import { Injectable } from '@nestjs/common';
import { OrderStatus, PrismaClient } from '@prisma/client';
import { BaseRepository } from '../../shared/factory/base.repository';
import { IOrder } from './interfaces/order.interface';
import { userWithRoleSelect } from 'src/common/utils/helpers.util';

@Injectable()
export class OrderRepository extends BaseRepository<IOrder> {
  constructor(prisma: PrismaClient) {
    super(prisma, prisma.order, ['sku', 'customerName', 'customerPhone']);
  }

  async getAllOrdersForDriver(driverId: string) {
    return this.model.findMany({
      where: {
        driverId,
        status: {
          in: [
            OrderStatus.ASSIGNED_FOR_PICKUP,
            OrderStatus.PICKED_UP,
            OrderStatus.OUT_FOR_DELIVERY,
          ],
        },
      },
      include: {
        driver: {
          select: userWithRoleSelect,
        },
        warehouse: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllOrdersForCustomer(customerId: string) {
    return this.model.findMany({
      where: { customerId },
      include: {
        customer: { select: userWithRoleSelect },
        warehouse: {
          select: { id: true, name: true, location: true },
        },
        driver: {
          select: userWithRoleSelect,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
