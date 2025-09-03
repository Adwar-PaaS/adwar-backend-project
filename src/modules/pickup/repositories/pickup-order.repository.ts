import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../db/prisma/prisma.service';
import { OrderStatus } from '@prisma/client';

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

  async existsInAnyPickup(orderId: string) {
    return this.prisma.pickUpOrder.findFirst({
      where: { orderId },
    });
  }
  
  async findOrdersByCustomer(customerId: string) {
    return this.prisma.pickUpOrder.findMany({
      where: {
        order: { customerId },
      },
      include: { order: true, pickup: true },
    });
  }

  async updateOrderStatus(orderId: string, status: OrderStatus) {
    return this.prisma.order.update({
      where: { id: orderId },
      data: { status },
    });
  }

  async findOrdersByPickup(pickupId: string) {
    return this.prisma.pickUpOrder.findMany({
      where: { pickupId },
      include: { order: true },
    });
  }
}
