import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { BaseRepository } from '../../shared/factory/base.repository';
import { PrismaService } from 'src/db/prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { UpdateOrderDto } from './dto/update-order.dto';
import { UpdateItemsInOrderDto } from './dto/update-order-items.dto';
import { RedisService } from 'src/db/redis/redis.service';
import { Prisma, Order } from '@prisma/client';

export type SafeOrder = Order;

@Injectable()
export class OrderRepository extends BaseRepository<
  Order,
  SafeOrder,
  Prisma.OrderDelegate
> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly redis: RedisService,
  ) {
    super(prisma, prisma.order, ['orderNumber'], {
      id: true,
      orderNumber: true,
      referenceNumber: true,
      totalWeight: true,
      totalValue: true,
      packageCount: true,
      specialInstructions: true,
      status: true,
      failedReason: true,
      priority: true,
      estimatedDelivery: true,
      createdAt: true,
      updatedAt: true,
      deletedAt: true,
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
  ): Promise<Order> {
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

  async updateWithProducts(id: string, dto: UpdateOrderDto): Promise<Order> {
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

  async updateItemsInOrder(
    orderId: string,
    items: Partial<UpdateItemsInOrderDto['items'][0]>[],
  ): Promise<Order> {
    return this.prisma.$transaction(async (tx) => {
      for (const dto of items) {
        if (!dto.id) continue;

        const existingItem = await tx.orderItem.findFirst({
          where: { id: dto.id, orderId },
          include: { product: true },
        });
        if (!existingItem) {
          throw new NotFoundException(`Order item ${dto.id} not found`);
        }

        let productId = existingItem.productId;
        if (dto.sku) {
          const product = await tx.product.upsert({
            where: { sku: dto.sku },
            update: {
              name: dto.name ?? undefined,
              description: dto.description ?? undefined,
              weight: dto.weight ?? undefined,
              isFragile: dto.isFragile ?? undefined,
            },
            create: {
              sku: dto.sku,
              name: dto.name!,
              description: dto.description,
              weight: dto.weight ?? undefined,
              isFragile: dto.isFragile ?? false,
            },
          });
          productId = product.id;
        }

        const quantity = dto.quantity ?? existingItem.quantity;
        const unitPrice = dto.unitPrice ?? Number(existingItem.unitPrice);
        const total = quantity * unitPrice;

        await tx.orderItem.update({
          where: { id: dto.id },
          data: {
            productId,
            quantity,
            unitPrice,
            total,
          },
        });
      }

      const allItems = await tx.orderItem.findMany({
        where: { orderId },
        include: { product: true },
      });
      const totalValue = allItems.reduce(
        (acc, item) => acc + Number(item.total),
        0,
      );
      const totalWeight = allItems.reduce(
        (acc, item) =>
          acc +
          (item.product?.weight ? Number(item.product.weight) : 0) *
            item.quantity,
        0,
      );

      return tx.order.update({
        where: { id: orderId },
        data: { totalValue, totalWeight },
        include: { items: { include: { product: true } }, customer: true },
      }) as any;
    });
  }
}

// import {
//   Injectable,
//   BadRequestException,
//   NotFoundException,
// } from '@nestjs/common';
// import { OrderStatus } from '@prisma/client';
// import { BaseRepository } from '../../shared/factory/base.repository';
// import { IOrder } from './interfaces/order.interface';
// import { PrismaService } from 'src/db/prisma/prisma.service';
// import { CreateOrderDto } from './dto/create-order.dto';
// import { AuthUser } from '../auth/interfaces/auth-user.interface';
// import { UpdateOrderDto } from './dto/update-order.dto';
// import { UpdateItemsInOrderDto } from './dto/update-order-items.dto';
// import { RedisService } from 'src/db/redis/redis.service';
// @Injectable()
// export class OrderRepository extends BaseRepository<IOrder> {
//   constructor(
//     protected readonly prisma: PrismaService,
//     protected readonly redis: RedisService,
//   ) {
//     super(prisma, redis, 'order', ['orderNumber'], {
//       pickup: true,
//       customer: true,
//       items: {
//         include: {
//           product: true,
//         },
//       },
//     });
//   }

//   private async prepareOrderItems(
//     items: CreateOrderDto['items'][0][],
//   ): Promise<{
//     validItems: typeof items;
//     itemsForCreate: {
//       productId: string;
//       quantity: number;
//       unitPrice: number;
//       total: number;
//     }[];
//   }> {
//     const productIdForSku: Record<string, string> = {};

//     await Promise.all(
//       items
//         .filter((i) => i.sku)
//         .map(async (item) => {
//           const product = await this.prisma.product.upsert({
//             where: { sku: item.sku! },
//             update: {
//               name: item.name,
//               description: item.description,
//               weight: item.weight ?? undefined,
//               isFragile: item.isFragile ?? undefined,
//             },
//             create: {
//               sku: item.sku!,
//               name: item.name,
//               description: item.description,
//               weight: item.weight ?? undefined,
//               isFragile: item.isFragile ?? false,
//             },
//           });
//           productIdForSku[item.sku!] = product.id;
//         }),
//     );

//     const validItems = items.filter((i) => i.sku && productIdForSku[i.sku!]);

//     const itemsForCreate = validItems.map((i) => ({
//       productId: productIdForSku[i.sku!],
//       quantity: i.quantity,
//       unitPrice: i.unitPrice,
//       total: i.quantity * i.unitPrice,
//     }));

//     return { validItems, itemsForCreate };
//   }

//   private calculateTotals(
//     dto: Pick<CreateOrderDto | UpdateOrderDto, 'totalValue' | 'totalWeight'>,
//     itemsForCreate: { total: number }[],
//     validItems: { weight?: number; quantity: number }[],
//   ) {
//     const totalValue =
//       dto.totalValue ??
//       itemsForCreate.reduce((acc, item) => acc + Number(item.total), 0);

//     const totalWeight =
//       dto.totalWeight ??
//       validItems.reduce(
//         (acc, i) => acc + Number(i.weight || 0) * i.quantity,
//         0,
//       );

//     return { totalValue, totalWeight };
//   }

//   async createWithProducts(
//     user: AuthUser,
//     dto: CreateOrderDto,
//   ): Promise<IOrder> {
//     return this.prisma.$transaction(async (tx) => {
//       const { validItems, itemsForCreate } = await this.prepareOrderItems(
//         dto.items || [],
//       );

//       const { totalValue, totalWeight } = this.calculateTotals(
//         dto,
//         itemsForCreate,
//         validItems,
//       );

//       return tx.order.create({
//         data: {
//           orderNumber: dto.orderNumber!,
//           customerId: user.id,
//           specialInstructions: dto.specialInstructions,
//           status: dto.status ?? OrderStatus.PENDING,
//           failedReason: dto.failedReason,
//           priority: dto.priority,
//           totalValue,
//           totalWeight,
//           estimatedDelivery: dto.estimatedDelivery
//             ? new Date(dto.estimatedDelivery)
//             : undefined,
//           items: itemsForCreate.length ? { create: itemsForCreate } : undefined,
//         },
//         include: { items: true, customer: true },
//       }) as any;
//     });
//   }

//   async updateWithProducts(id: string, dto: UpdateOrderDto): Promise<IOrder> {
//     return this.prisma.$transaction(async (tx) => {
//       const { validItems, itemsForCreate } = await this.prepareOrderItems(
//         dto.items || [],
//       );

//       const { totalValue, totalWeight } = this.calculateTotals(
//         dto,
//         itemsForCreate,
//         validItems,
//       );

//       const { items: _omit, ...restDto } = dto as any;

//       return tx.order.update({
//         where: { id },
//         data: {
//           ...restDto,
//           totalValue,
//           totalWeight,
//           items: {
//             deleteMany: {
//               orderId: id,
//             },
//             ...(itemsForCreate.length
//               ? {
//                   create: itemsForCreate.map((item) => ({
//                     ...item,
//                     orderId: id,
//                   })),
//                 }
//               : {}),
//           },
//         },
//         include: {
//           items: {
//             include: { product: true },
//           },
//           customer: true,
//         },
//       }) as any;
//     });
//   }

//   async updateItemsInOrder(
//     orderId: string,
//     items: Partial<UpdateItemsInOrderDto['items'][0]>[],
//   ): Promise<IOrder> {
//     return this.prisma.$transaction(async (tx) => {
//       for (const dto of items) {
//         if (!dto.id) continue;

//         const existingItem = await tx.orderItem.findFirst({
//           where: { id: dto.id, orderId },
//           include: { product: true },
//         });
//         if (!existingItem) {
//           throw new NotFoundException(`Order item ${dto.id} not found`);
//         }

//         let productId = existingItem.productId;
//         if (dto.sku) {
//           const product = await tx.product.upsert({
//             where: { sku: dto.sku },
//             update: {
//               name: dto.name ?? undefined,
//               description: dto.description ?? undefined,
//               weight: dto.weight ?? undefined,
//               isFragile: dto.isFragile ?? undefined,
//             },
//             create: {
//               sku: dto.sku,
//               name: dto.name!,
//               description: dto.description,
//               weight: dto.weight ?? undefined,
//               isFragile: dto.isFragile ?? false,
//             },
//           });
//           productId = product.id;
//         }

//         const quantity = dto.quantity ?? existingItem.quantity;
//         const unitPrice = dto.unitPrice ?? Number(existingItem.unitPrice);
//         const total = quantity * unitPrice;

//         await tx.orderItem.update({
//           where: { id: dto.id },
//           data: {
//             productId,
//             quantity,
//             unitPrice,
//             total,
//           },
//         });
//       }

//       const allItems = await tx.orderItem.findMany({
//         where: { orderId },
//         include: { product: true },
//       });
//       const totalValue = allItems.reduce(
//         (acc, item) => acc + Number(item.total),
//         0,
//       );
//       const totalWeight = allItems.reduce(
//         (acc, item) =>
//           acc +
//           (item.product?.weight ? Number(item.product.weight) : 0) *
//             item.quantity,
//         0,
//       );

//       return tx.order.update({
//         where: { id: orderId },
//         data: { totalValue, totalWeight },
//         include: { items: { include: { product: true } }, customer: true },
//       }) as any;
//     });
//   }
// }
