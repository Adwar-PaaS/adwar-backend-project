import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { BaseRepository } from '../../shared/factory/base.repository';
import { IOrder } from './interfaces/order.interface';
import { PrismaService } from 'src/db/prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { UpdateOrderDto } from './dto/update-order.dto';

@Injectable()
export class OrderRepository extends BaseRepository<IOrder> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma, 'order', ['orderNumber'], {
      pickup: true,
      customer: true,
      items: {
        include: {
          product: true,
        },
      },
    });
  }

  private async prepareOrderItems(
    items: CreateOrderDto['items'][0][],
  ): Promise<{
    validItems: typeof items;
    itemsForCreate: {
      productId: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }[];
  }> {
    const productIdForSku: Record<string, string> = {};

    await Promise.all(
      items
        .filter((i) => i.sku)
        .map(async (item) => {
          const product = await this.prisma.product.upsert({
            where: { sku: item.sku! },
            update: {
              name: item.name,
              description: item.description,
              weight: item.weight ?? undefined,
              isFragile: item.isFragile ?? undefined,
            },
            create: {
              sku: item.sku!,
              name: item.name,
              description: item.description,
              weight: item.weight ?? undefined,
              isFragile: item.isFragile ?? false,
            },
          });
          productIdForSku[item.sku!] = product.id;
        }),
    );

    const validItems = items.filter((i) => i.sku && productIdForSku[i.sku!]);

    const itemsForCreate = validItems.map((i) => ({
      productId: productIdForSku[i.sku!],
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      total: i.quantity * i.unitPrice,
    }));

    return { validItems, itemsForCreate };
  }

  private calculateTotals(
    dto: Pick<CreateOrderDto | UpdateOrderDto, 'totalValue' | 'totalWeight'>,
    itemsForCreate: { total: number }[],
    validItems: { weight?: number; quantity: number }[],
  ) {
    const totalValue =
      dto.totalValue ??
      itemsForCreate.reduce((acc, item) => acc + Number(item.total), 0);

    const totalWeight =
      dto.totalWeight ??
      validItems.reduce(
        (acc, i) => acc + Number(i.weight || 0) * i.quantity,
        0,
      );

    return { totalValue, totalWeight };
  }

  async createWithProducts(
    user: AuthUser,
    dto: CreateOrderDto,
  ): Promise<IOrder> {
    return this.prisma.$transaction(async (tx) => {
      const { validItems, itemsForCreate } = await this.prepareOrderItems(
        dto.items || [],
      );

      const { totalValue, totalWeight } = this.calculateTotals(
        dto,
        itemsForCreate,
        validItems,
      );

      return tx.order.create({
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
      }) as any;
    });
  }

  async updateWithProducts(id: string, dto: UpdateOrderDto): Promise<IOrder> {
    const { validItems, itemsForCreate } = await this.prepareOrderItems(
      dto.items || [],
    );

    const { totalValue, totalWeight } = this.calculateTotals(
      dto,
      itemsForCreate,
      validItems,
    );

    const { items: _omit, ...restDto } = dto as any;

    return this.prisma.order.update({
      where: { id },
      data: {
        ...restDto,
        totalValue,
        totalWeight,
        items: {
          deleteMany: {},
          ...(itemsForCreate.length ? { create: itemsForCreate } : {}),
        },
      },
      include: { items: true, customer: true },
    }) as any;
  }
}
