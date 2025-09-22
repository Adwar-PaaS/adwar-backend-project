import { BadRequestException, Injectable, HttpStatus } from '@nestjs/common';
import { PickUpRepository } from './pickup.repository';
import {
  EntityType,
  NotificationCategory,
  NotificationChannel,
  PickUp,
  PickUpStatus,
  PriorityStatus,
  RoleName,
} from '@prisma/client';
import { NotificationService } from 'src/shared/notification/notification.service';
import { CreatePickupDto } from './dto/create-pickup.dto';
import { UpdatePickupDto } from './dto/update-pickup.dto';
import { OrderRepository } from '../order/order.repository';
import { UpdatePickupAndOrdersStatusDto } from './dto/update-pickup-and-orders-status.dto';
import { AddressService } from 'src/shared/address/address.service';
import { ApiError } from '../../common/exceptions/api-error.exception';
import { TenantService } from '../tenant/tenant.service';
import { AuthUser } from '../auth/interfaces/auth-user.interface';

@Injectable()
export class PickUpService {
  constructor(
    private readonly pickupRepo: PickUpRepository,
    private readonly orderRepo: OrderRepository,
    private readonly notificationService: NotificationService,
    private readonly addressService: AddressService,
    private readonly tenantService: TenantService,
  ) {}

  private async sendNotificationToUsers(
    senderId: string,
    recipientIds: string[],
    title: string,
    message: string,
    relatedId: string,
    options?: Partial<{
      relatedType: EntityType;
      category: NotificationCategory;
      priority: PriorityStatus;
      channels: NotificationChannel[];
    }>,
  ) {
    if (!recipientIds.length) return;
    await this.notificationService.create({
      senderId,
      recipientIds,
      title,
      message,
      relatedId,
      relatedType: options?.relatedType ?? EntityType.PICKUP,
      category: options?.category ?? NotificationCategory.ACTION,
      priority: options?.priority ?? PriorityStatus.HIGH,
      channels: options?.channels ?? [NotificationChannel.IN_APP],
    });
  }

  private mapNotificationsForPickups(
    notifications: any[],
    pickupIds: string[],
  ) {
    return notifications
      .filter(
        (n) =>
          n.notification.relatedType === EntityType.PICKUP &&
          n.notification.relatedId &&
          pickupIds.includes(n.notification.relatedId) &&
          n.notification.category === NotificationCategory.ACTION,
      )
      .map((n) => ({
        notificationId: n.id,
        pickupId: n.notification.relatedId,
        title: n.notification.title,
        message: n.notification.message,
        readAt: n.readAt,
        createdAt: n.notification.createdAt,
      }));
  }

  private async updatePickupAndOrdersStatus(
    pickupId: string,
    pickupStatus: PickUpStatus,
    orderStatus: string,
  ) {
    await this.pickupRepo.update(pickupId, { status: pickupStatus });
    const orders = await this.orderRepo.findMany({ pickupId });
    const orderIds = orders.map((o) => o.id);
    if (orderIds.length) {
      await this.orderRepo.updateMany(orderIds, { status: orderStatus });
    }
    return orders;
  }

  async createPickup(dto: CreatePickupDto) {
    if (!dto.orderIds?.length) {
      throw new BadRequestException('orderIds is required and cannot be empty');
    }

    const existingOrders = await this.orderRepo.findMany({
      id: { in: dto.orderIds },
      pickupId: { not: null },
    });

    if (existingOrders.length > 0) {
      throw new ApiError(
        'Some orders are already assigned to a pickup',
        HttpStatus.BAD_REQUEST,
      );
    }

    let addressId: string | undefined;
    if (dto.address) {
      const address = await this.addressService.create(dto.address);
      addressId = address.id;
    }

    const pickup = await this.pickupRepo.create({
      scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : undefined,
      driverId: dto.driverId,
      branchId: dto.branchId,
      addressId,
      notes: dto.notes,
    });

    await this.orderRepo.updateMany(dto.orderIds, { pickupId: pickup.id });

    return this.pickupRepo.findOne({ id: pickup.id });
  }

  async updatePickup(pickupId: string, dto: UpdatePickupDto) {
    const pickup = await this.pickupRepo.findOne({ id: pickupId });
    if (!pickup) throw new BadRequestException('Pickup not found');
    if (pickup.status !== PickUpStatus.CREATED) {
      throw new BadRequestException(
        `You can only update pickups in CREATED status. Current status: ${pickup.status}`,
      );
    }

    if (dto.orderIds?.length) {
      const existingOrders = await this.orderRepo.findMany({
        id: { in: dto.orderIds },
        pickupId: { not: pickupId },
      });

      if (existingOrders.length > 0) {
        throw new ApiError(
          `Some orders are already assigned to another pickup: ${existingOrders.map((o) => o.id).join(', ')}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const currentOrders = await this.orderRepo.findMany({ pickupId });
      const currentOrderIds = currentOrders.map((o) => o.id);

      if (currentOrderIds.length) {
        await this.orderRepo.updateMany(currentOrderIds, { pickupId: null });
      }

      await this.orderRepo.updateMany(dto.orderIds, { pickupId });
    }

    const { orderIds, ...rest } = dto;
    return this.pickupRepo.update(pickupId, rest);
  }

  async updatePickupStatusAndOrders(
    pickupId: string,
    dto: UpdatePickupAndOrdersStatusDto,
    user: AuthUser,
  ) {
    const pickup = await this.pickupRepo.findOne({ id: pickupId });
    if (!pickup) throw new BadRequestException('Pickup not found');

    await this.updatePickupAndOrdersStatus(
      pickupId,
      dto.pickupStatus,
      dto.orderStatus,
    );

    const tenantId = user.tenant?.id;
    if (tenantId) {
      const operationUsers =
        await this.tenantService.getAllOperationsUsers(tenantId);
      const recipientIds = operationUsers.map((u) => u.id);
      await this.sendNotificationToUsers(
        user.id,
        recipientIds,
        `Pickup is waiting for your action`,
        `Pickup ${pickup.pickupNumber} has been marked as ${dto.pickupStatus}. Please take the necessary actions.`,
        pickupId,
      );
    }

    return this.pickupRepo.findOne({ id: pickupId });
  }

  async opsRespondOnPickupRequest(
    pickupId: string,
    dto: UpdatePickupAndOrdersStatusDto,
    user: AuthUser,
  ) {
    const pickup = await this.pickupRepo.findOne({ id: pickupId });
    if (!pickup) throw new BadRequestException('Pickup not found');

    const orders = await this.updatePickupAndOrdersStatus(
      pickupId,
      dto.pickupStatus,
      dto.orderStatus,
    );

    for (const order of orders) {
      if (order.customerId) {
        await this.sendNotificationToUsers(
          user.id,
          [order.customerId],
          `Your pickup request has been processed`,
          `Pickup ${pickup.pickupNumber} has been updated to ${dto.pickupStatus}. Your order status is now ${dto.orderStatus}.`,
          pickupId,
        );
      }
    }

    return this.pickupRepo.findOne({ id: pickupId });
  }

  async getPickupNotificationsForOPS(user: AuthUser) {
    if (!user.tenant?.id)
      throw new BadRequestException('User tenant not found');
    if (user.role?.name !== RoleName.OPERATION)
      throw new BadRequestException('Only operation users can access this');

    const pickups = await this.pickupRepo.findMany({
      status: PickUpStatus.PENDING,
      orders: {
        some: {
          customer: {
            memberships: {
              some: { tenantId: user.tenant.id },
            },
          },
        },
      },
    });

    if (!pickups.length) return [];

    const pickupIds = pickups.map((p) => p.id).filter(Boolean);
    const notifications = await this.notificationService.listForUser(user.id);

    return this.mapNotificationsForPickups(notifications, pickupIds);
  }

  async getCustomerPickupNotifications(user: AuthUser) {
    if (user.role?.name !== RoleName.CUSTOMER)
      throw new BadRequestException('Only customers can access this');

    const pickups = await this.pickupRepo.findMany({
      orders: { some: { customerId: user.id } },
      NOT: { status: PickUpStatus.CREATED },
    });
    if (!pickups.length) return [];

    const pickupIds = pickups.map((p) => p.id).filter(Boolean);
    const notifications = await this.notificationService.listForUser(user.id);

    return this.mapNotificationsForPickups(notifications, pickupIds);
  }

  async findAll(query: Record<string, any>) {
    return this.pickupRepo.findAll(query);
  }

  async getPickupOrders(pickupId: string) {
    return this.orderRepo.findMany({ pickupId });
  }

  async getPickupsOfBranch(branchId: string, query: Record<string, any> = {}) {
    return this.pickupRepo.findAll(query, { branchId });
  }

  async getPickupsOfTenant(tenantId: string, query: Record<string, any> = {}) {
    return this.pickupRepo.findAll(query, {
      orders: {
        some: {
          customer: {
            memberships: {
              some: { tenantId },
            },
          },
        },
      },
      NOT: { status: PickUpStatus.CREATED },
    });
  }

  async getPickupsOfCustomer(
    customerId: string,
    query: Record<string, any> = {},
  ) {
    return this.pickupRepo.findAll(query, { orders: { some: { customerId } } });
  }

  async findOne(id: string): Promise<PickUp | null> {
    return this.pickupRepo.findOne({ id });
  }

  async deletePickup(pickupId: string) {
    return this.pickupRepo.delete(pickupId);
  }
}
