import { Injectable } from '@nestjs/common';
import { OrderStatus, PickUpStatus } from '@prisma/client';
import { BaseRepository } from '../../shared/factory/base.repository';
import { IOrder } from './interfaces/order.interface';
import { userWithRoleSelect } from 'src/common/utils/helpers.util';
import { PrismaService } from 'src/db/prisma/prisma.service';

@Injectable()
export class OrderRepository extends BaseRepository<IOrder> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma, prisma.order, ['orderNumber']);
  }

  async getAllOrdersForDriver(driverId: string) {
    const pickups = await this.prisma.pickUp.findMany({
      where: {
        driverId,
        deletedAt: null,
        status: { in: [PickUpStatus.CREATED, PickUpStatus.IN_PROGRESS] },
        orders: {
          some: {
            order: {
              deletedAt: null,
              status: {
                in: [
                  OrderStatus.ASSIGNED_FOR_PICKUP,
                  OrderStatus.PICKED_UP,
                  OrderStatus.OUT_FOR_DELIVERY,
                ],
              },
            },
          },
        },
      },
      include: {
        branch: {
          select: {
            id: true,
            name: true,
            address: {
              select: {
                city: true,
                country: true,
                latitude: true,
                longitude: true,
              },
            },
          },
        },
        driver: {
          select: userWithRoleSelect,
        },
        orders: {
          where: {
            deletedAt: null,
            order: {
              deletedAt: null,
            },
          },
          include: {
            order: {
              include: {
                customer: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return pickups.flatMap((p) =>
      p.orders.map((po) => ({
        ...po.order,
        pickupId: p.id,
        driver: p.driver,
        branch: p.branch,
      })),
    );
  }

  async getAllOrdersForCustomer(customerId: string) {
    return this.model.findMany({
      where: { customerId },
      include: {
        customer: { select: userWithRoleSelect },
        branch: {
          select: { id: true, name: true },
        },
        driver: {
          select: userWithRoleSelect,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByItemSku(sku: string) {
    return this.prisma.order.findFirst({
      where: {
        items: {
          some: { sku },
        },
        deletedAt: null,
      },
      include: {
        items: true,
        customer: { select: userWithRoleSelect },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
