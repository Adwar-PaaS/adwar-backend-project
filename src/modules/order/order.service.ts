import { Injectable } from '@nestjs/common';
import { OrderRepository } from './order.repository';
import { IOrder } from './interfaces/order.interface';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Injectable()
export class OrderService {
  constructor(
    private readonly orderRepo: OrderRepository,
  ) {}

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

  async delete(id: string): Promise<void> {
    return this.orderRepo.delete(id);
  }
}
