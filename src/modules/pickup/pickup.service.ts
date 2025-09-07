import { BadRequestException, Injectable } from '@nestjs/common';
import { PickUpRepository } from './repositories/pickup.repository';
import { PickUpOrderRepository } from './repositories/pickup-order.repository';
import { PickUpRequestRepository } from './repositories/pickup-request.repository';
import { RequestStatus, OrderStatus } from '@prisma/client';

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

      if (order.status === OrderStatus.PENDING) {
        throw new BadRequestException(`Order ${orderId} is still pending`);
      }

      const inOtherPickup =
        await this.pickupOrderRepo.existsInAnyPickup(orderId);
      if (inOtherPickup) {
        throw new BadRequestException(
          `Order ${orderId} is already assigned to another pickup`,
        );
      }

      await this.pickupOrderRepo.addOrder(pickup.id, orderId);
    }

    return pickup;
  }

  async addOrder(pickupId: string, orderId: string) {
    const order = await this.pickupOrderRepo.findOrderById(orderId);
    if (!order) throw new BadRequestException('Order not found');
    if (order.status === OrderStatus.PENDING) {
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
    const request = this.pickupRequestRepo.create(pickupId, userId);

    const pickup = await this.pickupRepo.findById(pickupId);

    if (!pickup) {
      throw new BadRequestException('Pickup not found');
    }

    for (const pickupOrder of pickup.orders) {
      await this.pickupOrderRepo.updateOrderStatus(
        pickupOrder.orderId,
        OrderStatus.PENDING,
      );
    }

    return request;
  }

  async respondToRequest(
    requestId: string,
    userId: string,
    status: RequestStatus,
  ) {
    return this.pickupRequestRepo.respond(requestId, userId, status);
  }

  async getPickupOrders(pickupId: string) {
    const pickupOrders =
      await this.pickupOrderRepo.findOrdersByPickup(pickupId);

    return pickupOrders.map((po) => po.order);
  }

  async getPickupRequests(pickupId: string) {
    return this.pickupRequestRepo.findRequestsByPickup(pickupId);
  }

  async getAllPickupOrdersForCustomer(customerId: string) {
    return this.pickupOrderRepo.findOrdersByCustomer(customerId);
  }

  async getAllPickupRequestsForCustomer(customerId: string) {
    return this.pickupRequestRepo.findRequestsByCustomer(customerId);
  }
}
