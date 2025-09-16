import { Injectable } from '@nestjs/common';
import { OrderStatus, PickUpStatus } from '@prisma/client';
import { BaseRepository } from '../../shared/factory/base.repository';
import { IOrder } from './interfaces/order.interface';
import { userWithRoleSelect } from 'src/common/utils/helpers.util';
import { PrismaService } from 'src/db/prisma/prisma.service';

@Injectable()
export class OrderRepository extends BaseRepository<IOrder> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma, prisma.order, ['orderNumber'], {
      pickUp: true,
    });
  }
}
