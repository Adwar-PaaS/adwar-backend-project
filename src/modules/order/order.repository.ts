import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { BaseRepository } from '../../shared/factory/base.repository';
import { IOrder } from './interfaces/order.interface';

@Injectable()
export class OrderRepository extends BaseRepository<IOrder> {
  constructor(prisma: PrismaClient) {
    super(prisma, prisma.order, ['sku', 'customerName', 'customerPhone']);
  }
}
