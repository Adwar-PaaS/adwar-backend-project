import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { BaseRepository } from '../../shared/factory/base.repository';
import { IOrder } from './interfaces/order.interface';
import { userWithRoleSelect } from 'src/common/utils/helpers.util';
import { PrismaService } from 'src/db/prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { AuthUser } from '../auth/interfaces/auth-user.interface';

@Injectable()
export class OrderRepository extends BaseRepository<IOrder> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma, prisma.order, ['orderNumber'], {
      pickUp: true,
      customer: true,
    });
  }

  async updateMany(where: Record<string, any>, data: Record<string, any>) {
    return this.prisma.order.updateMany({ where, data });
  }

  async updateManyByIds(ids: string[], data: Record<string, any>) {
    if (!ids || ids.length === 0) return { count: 0 } as any;
    return this.updateMany({ id: { in: ids } }, data);
  }

  async createWithProducts(
    user: AuthUser,
    dto: CreateOrderDto,
  ): Promise<IOrder> {
    const items = dto.items || [];

    const order = await this.prisma.$transaction(async (tx) => {
      const productIdForSku: Record<string, string> = {};
      for (const item of items) {
        if (!item.sku) continue;
        const product = await tx.product.upsert({
          where: { sku: item.sku },
          update: {
            name: item.name,
            description: item.description,
            weight: (item.weight as any) ?? undefined,
          },
          create: {
            sku: item.sku,
            name: item.name,
            description: item.description,
            weight: (item.weight as any) ?? undefined,
          },
        });
        productIdForSku[item.sku] = product.id;
      }

      const itemsForCreate = items.map((i) => ({
        productId: productIdForSku[i.sku],
        quantity: i.quantity,
        unitPrice: i.unitPrice as any,
        total: (i.quantity * i.unitPrice) as any,
      }));

      const totalValue = itemsForCreate.reduce(
        (acc, item) => acc + Number(item.total),
        0,
      );

      const totalWeight = items.reduce(
        (acc, i) => acc + Number(i.weight || 0) * i.quantity,
        0,
      );

      const created = await tx.order.create({
        data: {
          orderNumber: dto.orderNumber!,
          customerId: user.id,
          specialInstructions: dto.specialInstructions,
          status: dto.status ?? OrderStatus.PENDING,
          failedReason: dto.failedReason,
          priority: dto.priority,
          totalValue: (dto.totalValue ?? totalValue) as any,
          totalWeight: (dto.totalWeight ?? totalWeight) as any,
          estimatedDelivery: dto.estimatedDelivery
            ? new Date(dto.estimatedDelivery as any)
            : undefined,
          items:
            itemsForCreate.length > 0 ? { create: itemsForCreate } : undefined,
        },
        include: { items: true, customer: true },
      });

      return created as any;
    });

    return order as any;
  }
}
