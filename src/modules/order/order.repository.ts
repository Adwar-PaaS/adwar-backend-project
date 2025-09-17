import { Injectable } from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { BaseRepository } from '../../shared/factory/base.repository';
import { IOrder } from './interfaces/order.interface';
import { PrismaService } from 'src/db/prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { AuthUser } from '../auth/interfaces/auth-user.interface';

@Injectable()
export class OrderRepository extends BaseRepository<IOrder> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma, 'order', ['orderNumber'], {
      pickUp: true,
      customer: true,
    });
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
            weight: item.weight ?? undefined,
          },
          create: {
            sku: item.sku,
            name: item.name,
            description: item.description,
            weight: item.weight ?? undefined,
          },
        });
        productIdForSku[item.sku] = product.id;
      }

      const validItems = items.filter((i) => i.sku && productIdForSku[i.sku]);

      const itemsForCreate = validItems.map((i) => ({
        productId: productIdForSku[i.sku],
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        total: i.quantity * i.unitPrice,
      }));

      const totalValue =
        dto.totalValue ??
        itemsForCreate.reduce((acc, item) => acc + Number(item.total), 0);

      const totalWeight =
        dto.totalWeight ??
        validItems.reduce(
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
          totalValue,
          totalWeight,
          estimatedDelivery: dto.estimatedDelivery
            ? new Date(dto.estimatedDelivery)
            : undefined,
          items: itemsForCreate.length ? { create: itemsForCreate } : undefined,
        },
        include: { items: true, customer: true },
      });

      return created as any;
    });

    return order;
  }

  async findOneBySku(sku: string) {
    const orderItem = await this.prisma.orderItem.findFirst({
      where: { product: { sku }, order: { deletedAt: null } },
      include: { order: true },
    });
    return orderItem?.order ?? null;
  }
}
