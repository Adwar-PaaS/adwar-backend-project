import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../db/prisma/prisma.service';

@Injectable()
export class PickUpOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async addOrder(pickupId: string, orderId: string) {
    return this.prisma.pickUpOrder.create({
      data: { pickupId, orderId },
    });
  }

  async removeOrder(pickupId: string, orderId: string) {
    return this.prisma.pickUpOrder.delete({
      where: { pickupId_orderId: { pickupId, orderId } },
    });
  }

  async exists(pickupId: string, orderId: string) {
    return this.prisma.pickUpOrder.findUnique({
      where: { pickupId_orderId: { pickupId, orderId } },
    });
  }

  async findOrderById(orderId: string) {
    return this.prisma.order.findUnique({ where: { id: orderId } });
  }

  async findOrdersByPickup(pickupId: string) {
    return this.prisma.pickUpOrder.findMany({
      where: { pickupId },
      include: { order: true },
    });
  }
}
