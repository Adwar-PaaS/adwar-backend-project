import { Injectable } from '@nestjs/common';
import { OrderRepository } from './order.repository';
import { IOrder } from './interfaces/order.interface';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Injectable()
export class OrderService {
  constructor(private readonly orderRepo: OrderRepository) {}

  async create(dto: CreateOrderDto): Promise<IOrder> {
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

  async getOrdersByDriver(driverId: string) {
    return this.orderRepo.findByDriver(driverId);
  }

  async delete(id: string): Promise<void> {
    return this.orderRepo.delete(id);
  }
}
