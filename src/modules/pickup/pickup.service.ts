import { BadRequestException, Injectable } from '@nestjs/common';
import { PickUpRepository } from './repositories/pickup.repository';
import { PickUpOrderRepository } from './repositories/pickup-order.repository';
import { PickUpRequestRepository } from './repositories/pickup-request.repository';
import { RequestStatus } from '@prisma/client';

@Injectable()
export class PickUpService {
  constructor(
    private readonly pickupRepo: PickUpRepository,
    private readonly pickupOrderRepo: PickUpOrderRepository,
    private readonly pickupRequestRepo: PickUpRequestRepository,
  ) {}

  async createPickup(orderIds: string[]) {
    const pickup = await this.pickupRepo.create();

    for (const orderId of orderIds) {
      const order = await this.pickupOrderRepo.findOrderById(orderId);
      if (!order) throw new BadRequestException(`Order ${orderId} not found`);
      if (order.status === 'PENDING') {
        throw new BadRequestException(`Order ${orderId} is still pending`);
      }

      await this.pickupOrderRepo.addOrder(pickup.id, orderId);
    }

    return pickup;
  }

  async addOrder(pickupId: string, orderId: string) {
    const order = await this.pickupOrderRepo.findOrderById(orderId);
    if (!order) throw new BadRequestException('Order not found');
    if (order.status === 'PENDING') {
      throw new BadRequestException('Cannot add a pending order');
    }

    const exists = await this.pickupOrderRepo.exists(pickupId, orderId);
    if (exists) throw new BadRequestException('Order already in pickup');

    return this.pickupOrderRepo.addOrder(pickupId, orderId);
  }

  async removeOrder(pickupId: string, orderId: string) {
    return this.pickupOrderRepo.removeOrder(pickupId, orderId);
  }

  async requestApproval(pickupId: string, userId: string) {
    return this.pickupRequestRepo.create(pickupId, userId);
  }

  async respondToRequest(
    requestId: string,
    userId: string,
    status: RequestStatus,
  ) {
    return this.pickupRequestRepo.respond(requestId, userId, status);
  }

  async getPickupOrders(pickupId: string) {
    return this.pickupOrderRepo.findOrdersByPickup(pickupId);
  }

  async getPickupRequests(pickupId: string) {
    return this.pickupRequestRepo.findRequestsByPickup(pickupId);
  }
}
