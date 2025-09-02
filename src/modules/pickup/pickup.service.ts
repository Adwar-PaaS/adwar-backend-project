import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma/prisma.service';
import { PickUpRepository } from './repositories/pickup.repository';
import { PickUpOrderRepository } from './repositories/pickup-order.repository';
import { PickUpRequestRepository } from './repositories/pickup-request.repository';
import { RequestStatus } from '@prisma/client';

@Injectable()
export class PickUpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pickupOrderRepo: PickUpOrderRepository,
  ) {}

  async createPickup(orderIds: string[]) {
    return this.prisma.$transaction(async (tx) => {
      const pickup = await tx.pickUp.create({ data: {} });

      for (const orderId of orderIds) {
        const order = await tx.order.findUnique({ where: { id: orderId } });
        if (!order) throw new BadRequestException(`Order ${orderId} not found`);
        if (order.status === 'PENDING')
          throw new BadRequestException(`Order ${orderId} is still pending`);

        await tx.pickUpOrder.create({
          data: { pickupId: pickup.id, orderId },
        });
      }

      return pickup;
    });
  }

  async addOrder(pickupId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new BadRequestException('Order not found');
    if (order.status === 'PENDING')
      throw new BadRequestException('Cannot add a pending order');

    const exists = await this.pickupOrderRepo.exists(pickupId, orderId);
    if (exists) throw new BadRequestException('Order already in pickup');

    return this.pickupOrderRepo.addOrder(pickupId, orderId);
  }

  async requestApproval(pickupId: string, userId: string) {
    return this.prisma.pickUpRequest.create({
      data: {
        pickup: { connect: { id: pickupId } },
        requester: { connect: { id: userId } },
      },
    });
  }

  async respondToRequest(
    requestId: string,
    userId: string,
    status: RequestStatus,
  ) {
    return this.prisma.pickUpRequest.update({
      where: { id: requestId },
      data: {
        responder: { connect: { id: userId } },
        status,
      },
    });
  }
}
