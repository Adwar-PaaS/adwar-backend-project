import { BadRequestException, Injectable } from '@nestjs/common';
import { PickUpRepository } from './repositories/pickup.repository';
import { PickUpOrderRepository } from './repositories/pickup-order.repository';
import { PickUpRequestRepository } from './repositories/pickup-request.repository';
import {
  RequestStatus,
  OrderStatus,
  PickUpStatus,
  EntityType,
  NotificationCategory,
} from '@prisma/client';
import { NotificationService } from 'src/shared/notification/notification.service';
import { CreatePickupDto } from './dto/create-pickup.dto';

@Injectable()
export class PickUpService {
  constructor(
    private readonly pickupRepo: PickUpRepository,
    private readonly pickupOrderRepo: PickUpOrderRepository,
    private readonly pickupRequestRepo: PickUpRequestRepository,
    private readonly notificationService: NotificationService,
  ) {}

  async createPickup(dto: CreatePickupDto) {
    const pickup = await this.pickupRepo.create({
      scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : undefined,
      driverId: dto.driverId,
      branchId: dto.branchId,
      notes: dto.notes,
    });

    for (const orderId of dto.orderIds) {
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
    const request = await this.pickupRequestRepo.create(pickupId, userId);

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

    // const approvers = await this.usersService.findApprovalIdByRoleAndTenant(
    //   request.requestedBy.tenantId,
    //   RoleName.OPERATION
    // );

    // for (const approver of approvers) {
    //   await this.notificationService.create({
    //     senderId: userId,
    //     recipientId: approver.id,
    //     title: 'Pickup Approval Requested',
    //     message: `Pickup ${pickupId} requires your approval.`,
    //     relatedId: pickupId,
    //     relatedType: EntityType.PICKUP,
    //     category: NotificationCategory.ACTION, // REQUEST
    //     channels: ['IN_APP'],
    //     priority: 'HIGH',
    //     broadcast: false,
    //   });
    // }

    // await this.notificationService.create({
    //   senderId: userId,
    //   recipientId: null, // null → broadcast, or set specific admin userId
    //   title: 'Pickup Approval Requested',
    //   message: `Pickup ${pickupId} requires approval.`,
    //   relatedId: pickupId,
    //   relatedType: EntityType.PICKUP,
    //   category: 'REQUEST',
    //   channels: ['IN_APP'],
    //   priority: 'HIGH',
    //   broadcast: true, // roadcast to all if needed
    // });

    return request;
  }

  async findAllRequests() {
    return this.pickupRequestRepo.findAll();
  }

  async respondToRequest(
    requestId: string,
    userId: string,
    status: RequestStatus,
  ) {
    const request = await this.pickupRequestRepo.respond(
      requestId,
      userId,
      status,
    );

    const pickup = await this.pickupRepo.findById(request.pickupId);
    if (!pickup) {
      throw new BadRequestException('Pickup not found');
    }

    let newStatus: PickUpStatus | undefined;
    if (status === RequestStatus.APPROVED) {
      newStatus = PickUpStatus.SCHEDULED;
    } else if (status === RequestStatus.REJECTED) {
      newStatus = PickUpStatus.CANCELLED;
    }

    if (newStatus) {
      await this.pickupRepo.updateStatus(pickup.id, newStatus);
    }

    return { request, pickupStatus: newStatus ?? pickup.status };
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
    const pickupsWithOrders =
      await this.pickupOrderRepo.findOrdersByCustomer(customerId);

    const pickupMap = new Map<
      string,
      { pickupId: string; status: string; orderIds: string[] }
    >();

    for (const p of pickupsWithOrders) {
      const pickupId = p.pickup.id;

      if (!pickupMap.has(pickupId)) {
        // const request = p.pickup.requests?.[0];
        const status = p.pickup.status || 'CREATED';

        pickupMap.set(pickupId, {
          pickupId,
          status,
          orderIds: [],
        });
      }

      pickupMap.get(pickupId)!.orderIds.push(p.order.id);
    }

    return Array.from(pickupMap.values());
  }

  async getAllPickupRequestsForCustomer(customerId: string) {
    return this.pickupRequestRepo.findRequestsByCustomer(customerId);
  }

  async deletePickup(pickupId: string) {
    return this.pickupRepo.delete(pickupId);
  }
}
