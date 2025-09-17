import { BadRequestException, Injectable } from '@nestjs/common';
import { PickUpRepository } from './pickup.repository';
import { PickUp } from '@prisma/client';
import { NotificationService } from 'src/shared/notification/notification.service';
import { CreatePickupDto } from './dto/create-pickup.dto';
import { UpdatePickupDto } from './dto/update-pickup.dto';
import { OrderRepository } from '../order/order.repository';
import { UpdatePickupAndOrdersStatusDto } from './dto/update-pickup-and-orders-status.dto';

@Injectable()
export class PickUpService {
  constructor(
    private readonly pickupRepo: PickUpRepository,
    private readonly orderRepo: OrderRepository,
    private readonly notificationService: NotificationService,
  ) {}

  async createPickup(dto: CreatePickupDto) {
    if (!dto.orderIds || dto.orderIds.length === 0) {
      throw new BadRequestException('orderIds is required and cannot be empty');
    }

    const pickup = await this.pickupRepo.create({
      scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : undefined,
      driverId: dto.driverId,
      branchId: dto.branchId,
      notes: dto.notes,
    });

    for (const orderId of dto.orderIds) {
      await this.orderRepo.update(orderId, { pickupId: pickup.id });
    }

    return this.pickupRepo.findOne({ id: pickup.id });
  }

  async updatePickup(pickupId: string, dto: UpdatePickupDto) {
    return this.pickupRepo.update(pickupId, dto);
  }

  async updatePickupStatusAndOrders(
    pickupId: string,
    dto: UpdatePickupAndOrdersStatusDto,
  ) {
    const pickup = await this.pickupRepo.findOne({ id: pickupId });
    if (!pickup) {
      throw new BadRequestException('Pickup not found');
    }

    await this.pickupRepo.update(pickupId, { status: dto.pickupStatus });

    const { items: orders } = await this.orderRepo.findAll({}, { pickupId });
    for (const order of orders) {
      await this.orderRepo.update(order.id, { status: dto.orderStatus });
    }

    return this.pickupRepo.findOne({ id: pickupId });
  }

  async findAll(query: Record<string, any>) {
    return this.pickupRepo.findAll(query);
  }

  async getPickupOrders(pickupId: string, query: Record<string, any> = {}) {
    return this.orderRepo.findAll({ pickupId, ...query });
  }

  async getPickupsOfBranch(branchId: string, query: Record<string, any> = {}) {
    return this.pickupRepo.findAll(query, { branchId });
  }

  async getPickupsOfTenant(tenantId: string, query: Record<string, any> = {}) {
    return this.pickupRepo.findAll(query, { branch: { tenantId } });
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
