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

  async createPickup(dto: CreatePickupDto) {
    if (!dto.orderIds || dto.orderIds.length === 0) {
      throw new BadRequestException('orderIds is required and cannot be empty');
    }

    const existingOrders = await this.orderRepo.findMany({
      id: { in: dto.orderIds },
      pickupId: { not: null },
    });

    if (existingOrders.length > 0) {
      const assignedIds = existingOrders.map((o) => o.id).join(', ');

      throw new ApiError(
        'Some orders are already assigned to a pickup',
        HttpStatus.BAD_REQUEST,
      ); // : ${assignedIds}
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
    if (!pickup) {
      throw new BadRequestException('Pickup not found');
    }

    if (pickup.status !== PickUpStatus.CREATED) {
      throw new BadRequestException(
        `You can only update pickups in CREATED status. Current status: ${pickup.status}`,
      );
    }

    if (dto.orderIds && dto.orderIds.length > 0) {
      const existingOrders = await this.orderRepo.findMany({
        id: { in: dto.orderIds },
        pickupId: { not: pickupId },
      });

      if (existingOrders.length > 0) {
        const assignedIds = existingOrders.map((o) => o.id).join(', ');
        throw new ApiError(
          `Some orders are already assigned to another pickup: ${assignedIds}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const currentOrders = await this.orderRepo.findMany({ pickupId });
      const currentOrderIds = currentOrders.map((o) => o.id);

      if (currentOrderIds.length > 0) {
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
    if (!pickup) {
      throw new BadRequestException('Pickup not found');
    }

    await this.pickupRepo.update(pickupId, { status: dto.pickupStatus });

    const orders = await this.orderRepo.findMany({ pickupId });
    const orderIds = orders.map((o) => o.id);
    if (orderIds.length) {
      await this.orderRepo.updateMany(orderIds, { status: dto.orderStatus });

      const tenantId = user.tenant.id;
      if (tenantId) {
        const operationUsers =
          await this.tenantService.getAllOperationsUsers(tenantId);

        const recipientIds = operationUsers.map((u) => u.id);
        if (recipientIds.length) {
          await this.notificationService.create({
            senderId: user.id,
            title: `Pickup is waiting for your action`,
            message: `Pickup ${pickup.pickupNumber} has been marked as ${dto.pickupStatus}. Please take the necessary actions.`,
            relatedId: pickupId,
            relatedType: EntityType.PICKUP,
            category: NotificationCategory.ACTION,
            priority: PriorityStatus.HIGH,
            channels: [NotificationChannel.IN_APP],
            recipientIds,
          });
        }
      }
    }

    return this.pickupRepo.findOne({ id: pickupId });
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
