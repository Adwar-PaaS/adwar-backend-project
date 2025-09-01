import { Injectable } from '@nestjs/common';
import { OrderRepository } from './order.repository';
import { IOrder } from './interfaces/order.interface';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderStatus } from '@prisma/client';
import { AuthUser } from '../auth/interfaces/auth-user.interface';

@Injectable()
export class OrderService {
  constructor(private readonly orderRepo: OrderRepository) {}

  async create(user: AuthUser, dto: CreateOrderDto): Promise<IOrder> {
    if (user?.role?.name === 'CUSTOMER') {
      dto.status = OrderStatus.CREATED;
      dto.customerId = user.id;
    }

    return this.orderRepo.create(dto);
  }

  async update(id: string, dto: UpdateOrderDto): Promise<IOrder> {
    return this.orderRepo.update(id, dto);
  }

  async findAll(query: Record<string, any>) {
    return this.orderRepo.findAll(query);
  }

  async findOne(id: string): Promise<IOrder | null> {
    return this.orderRepo.findOne({ id });
  }

  async updateStatus(id: string, dto: UpdateOrderStatusDto): Promise<IOrder> {
    const updates: any = { status: dto.status };

    switch (dto.status) {
      case 'ASSIGNED_FOR_PICKUP':
        updates.assignedAt = new Date();
        break;
      case 'PICKED_UP':
        updates.pickedAt = new Date();
        break;
      case 'DELIVERED':
        updates.deliveredAt = new Date();
        break;
      case 'FAILED':
        updates.failedReason = dto.failedReason;
        break;
    }

    if (dto.notes) updates.notes = dto.notes;

    return this.orderRepo.update(id, updates);
  }

  async getOrdersOfDriver(driverId: string) {
    return this.orderRepo.getAllOrdersForDriver(driverId);
  }

  async getOrdersOfCustomer(customerId: string) {
    return this.orderRepo.getAllOrdersForCustomer(customerId);
  }

  async delete(id: string): Promise<void> {
    return this.orderRepo.delete(id);
  }
}
