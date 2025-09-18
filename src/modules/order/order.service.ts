import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderRepository } from './order.repository';
import { IOrder } from './interfaces/order.interface';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderStatus } from '@prisma/client';
import { ScanUpdateStatusDto } from './dto/scan-update-status.dto';
import { ScanCreateOrderDto } from './dto/scan-create-order.dto';
import { PrismaService } from 'src/db/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import {
  computeHmacSha256,
  safeTimingEqual,
} from '../../common/utils/hmac.util';
import { AuthUser } from '../auth/interfaces/auth-user.interface';

@Injectable()
export class OrderService {
  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async create(user: AuthUser, dto: CreateOrderDto): Promise<IOrder> {
    return this.orderRepo.createWithProducts(user, dto);
  }

  async update(id: string, dto: UpdateOrderDto): Promise<IOrder> {
    if (dto.items !== undefined) {
      return this.orderRepo.updateWithProducts(id, dto);
    }
    return this.orderRepo.update(id, dto, { items: true });
  }

  async findAll(query: Record<string, any>) {
    return this.orderRepo.findAll(query);
  }

  async findOne(id: string): Promise<IOrder | null> {
    return this.orderRepo.findOne({ id });
  }

  async getCustomerOrders(customerId: string, query: Record<string, any> = {}) {
    return this.orderRepo.findAll(query, { customerId });
  }

  async delete(id: string): Promise<void> {
    return this.orderRepo.delete(id);
  }

  async findOneBySku(sku: string) {
    return this.orderRepo.findOneBySku(sku);
  }

  async getTenantOrders(query: Record<string, any>, tenantId: string) {
    return this.orderRepo.findAll(query, {
      customer: {
        is: {
          memberships: {
            some: { tenantId, deletedAt: null },
          },
          deletedAt: null,
        },
      },
    });
  }

  async scanUpdateStatus(
    dto: ScanUpdateStatusDto,
    signature?: string,
    rawBody?: Buffer,
  ): Promise<IOrder> {
    const secret = this.config.get<string>('WEBHOOK_HMAC_SECRET');
    if (secret && rawBody) {
      const expected = computeHmacSha256(secret, rawBody);
      if (!signature || !safeTimingEqual(expected, signature)) {
        throw new NotFoundException('Invalid webhook signature');
      }
    }
    const where =
      dto.codeType === 'ORDER_ID'
        ? { id: dto.code }
        : { orderNumber: dto.code };

    const order = await this.orderRepo.findOne(where);
    if (!order) throw new NotFoundException('Order not found');

    const updated = await this.orderRepo.update(order.id, {
      status: dto.status,
    });

    await this.prisma.trackingEvent.create({
      data: {
        orderId: order.id,
        updaterId: dto.updaterId,
        status: dto.status,
        location: dto.location,
        latitude: dto.latitude as any,
        longitude: dto.longitude as any,
        notes: dto.notes,
        eventType: 'SCAN',
        metadata: dto.metadata,
      },
    });

    return updated;
  }

  async scanCreateOrder(
    dto: ScanCreateOrderDto,
    signature?: string,
    rawBody?: Buffer,
  ): Promise<IOrder> {
    const secret = this.config.get<string>('WEBHOOK_HMAC_SECRET');
    if (secret && rawBody) {
      const expected = computeHmacSha256(secret, rawBody);
      if (!signature || !safeTimingEqual(expected, signature)) {
        throw new NotFoundException('Invalid webhook signature');
      }
    }
    const itemsWithTotal = (dto.items || []).map((item) => ({
      sku: item.sku,
      name: item.name,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      weight: item.weight,
      total: item.quantity * item.unitPrice,
    }));

    const totalValue = itemsWithTotal.reduce((acc, i) => acc + i.total, 0);
    const totalWeight = itemsWithTotal.reduce(
      (acc, i) => acc + (i.weight || 0) * i.quantity,
      0,
    );

    const orderData: any = {
      orderNumber: dto.orderNumber,
      referenceNumber: dto.referenceNumber,
      customerId: dto.customerId,
      branchId: dto.branchId,
      items: itemsWithTotal.length > 0 ? { create: itemsWithTotal } : undefined,
      totalValue,
      totalWeight,
      status: OrderStatus.CREATED,
      estimatedDelivery: dto.estimatedDelivery
        ? new Date(dto.estimatedDelivery)
        : undefined,
    };

    return this.orderRepo.create(orderData, { items: true });
  }
}

// import {
//   Injectable,
//   NotFoundException,
//   BadRequestException,
// } from '@nestjs/common';
// import { OrderRepository } from './order.repository';
// import { IOrder } from './interfaces/order.interface';
// import { CreateOrderDto } from './dto/create-order.dto';
// import { UpdateOrderDto } from './dto/update-order.dto';
// import { OrderStatus } from '@prisma/client';
// import {
//   ScanUpdateStatusDto,
//   BulkScanUpdateDto,
//   ScanHistoryQueryDto,
//   CodeType,
// } from './dto/scan-update-status.dto';
// import { ScanCreateOrderDto } from './dto/scan-create-order.dto';
// import { PrismaService } from 'src/db/prisma/prisma.service';
// import { ConfigService } from '@nestjs/config';
// import {
//   computeHmacSha256,
//   safeTimingEqual,
// } from '../../common/utils/hmac.util';
// import { AuthUser } from '../auth/interfaces/auth-user.interface';
// import { BulkItemScanDto } from './dto/bulk-item-scan.dto';
// import { OrderCompletionStatusDto } from './dto/order-completion-status.dto';
// import { ScanItemDto } from './dto/scan-item.dto';
// import { VALID_STATUS_TRANSITIONS } from './constants/status-transitions.const';

// @Injectable()
// export class OrderService {
//   private readonly maxBulkOperations = 100;
//   constructor(
//     private readonly orderRepo: OrderRepository,
//     private readonly prisma: PrismaService,
//     private readonly config: ConfigService,
//   ) {}

//   async create(user: AuthUser, dto: CreateOrderDto): Promise<IOrder> {
//     return this.orderRepo.createWithItems({
//       ...dto,
//       customerId: user.id,
//     });
//   }

//   async update(id: string, dto: UpdateOrderDto): Promise<IOrder> {
//     return dto.items !== undefined
//       ? this.orderRepo.updateWithItems(id, dto)
//       : this.orderRepo.update(id, dto, { items: true, customer: true });
//   }

//   async findAll(query: Record<string, any>) {
//     return this.orderRepo.findAll(query);
//   }

//   async findOne(id: string): Promise<IOrder | null> {
//     return this.orderRepo.findOne({ id });
//   }

//   async getCustomerOrders(customerId: string, query: Record<string, any> = {}) {
//     return this.orderRepo.findAll(query, { customerId });
//   }

//   async delete(id: string): Promise<void> {
//     return this.orderRepo.delete(id);
//   }

//   async findOneBySku(sku: string) {
//     return this.orderRepo.findOne({ sku });
//   }

//   async getTenantOrders(query: Record<string, any>, tenantId: string) {
//     return this.orderRepo.findAll(query, {
//       customer: {
//         is: {
//           memberships: { some: { tenantId, deletedAt: null } },
//           deletedAt: null,
//         },
//       },
//     });
//   }

//   private verifyWebhook(signature?: string, rawBody?: Buffer) {
//     const secret = this.config.get<string>('WEBHOOK_HMAC_SECRET');
//     if (secret && rawBody) {
//       const expected = computeHmacSha256(secret, rawBody);
//       if (!signature || !safeTimingEqual(expected, signature)) {
//         throw new NotFoundException('Invalid webhook signature');
//       }
//     }
//   }

//   // Scan individual item and check if order should be updated
//   async scanItem(
//     dto: ScanItemDto,
//     signature?: string,
//     rawBody?: Buffer,
//   ): Promise<{
//     order: IOrder;
//     itemScanned: boolean;
//     orderStatusUpdated: boolean;
//     completionStatus: OrderCompletionStatusDto;
//   }> {
//     this.verifyWebhook(signature, rawBody);

//     // Find order by ID or order number
//     const whereOrder = dto.orderId
//       ? { id: dto.orderId }
//       : { orderNumber: dto.orderNumber };

//     const order = await this.prisma.order.findFirst({
//       where: whereOrder as any,
//       include: { items: { include: { product: true } } },
//     });
//     if (!order) throw new NotFoundException('Order not found');

//     // Find the specific item by SKU
//     const orderItem = order.items?.find(
//       (item: any) => item.product?.sku === dto.sku,
//     );
//     if (!orderItem) {
//       throw new NotFoundException(
//         `Item with SKU ${dto.sku} not found in this order`,
//       );
//     }

//     // Mark order item as scanned
//     await this.prisma.orderItem.update({
//       where: { id: (orderItem as any).id },
//       data: { scannedAt: new Date() } as any,
//     });

//     // Create tracking event for item scan
//     await this.prisma.trackingEvent.create({
//       data: {
//         orderId: order.id,
//         updaterId: dto.updaterId,
//         status: dto.status,
//         location: dto.location,
//         latitude: dto.latitude as any,
//         longitude: dto.longitude as any,
//         notes: dto.notes || `Item scanned: ${dto.sku}`,
//         eventType: 'ITEM_SCAN',
//         metadata: {
//           ...dto.metadata,
//           scannedItem: {
//             sku: dto.sku,
//             orderItemId: (orderItem as any).id,
//             quantity: (orderItem as any).quantity,
//           },
//         },
//       },
//     });

//     // Check completion status
//     const completionStatus = await this.getOrderCompletionStatus(order.id);
//     let orderStatusUpdated = false;

//     // Auto-update order status if all items are scanned and status allows progression
//     if (
//       completionStatus.canProgressStatus &&
//       completionStatus.scannedItems === completionStatus.totalItems
//     ) {
//       if (
//         completionStatus.suggestedNextStatus &&
//         VALID_STATUS_TRANSITIONS[order.status]?.includes(
//           completionStatus.suggestedNextStatus,
//         )
//       ) {
//         await this.orderRepo.update(order.id, {
//           status: completionStatus.suggestedNextStatus,
//           ...(completionStatus.suggestedNextStatus ===
//             OrderStatus.PICKED_UP && { pickedAt: new Date() }),
//           ...(completionStatus.suggestedNextStatus ===
//             OrderStatus.DELIVERED && { deliveredAt: new Date() }),
//         });

//         // Create tracking event for order status update
//         await this.prisma.trackingEvent.create({
//           data: {
//             orderId: order.id,
//             updaterId: dto.updaterId,
//             status: completionStatus.suggestedNextStatus,
//             location: dto.location,
//             latitude: dto.latitude as any,
//             longitude: dto.longitude as any,
//             notes: 'Order status auto-updated after all items scanned',
//             eventType: 'AUTO_STATUS_UPDATE',
//             metadata: {
//               trigger: 'ALL_ITEMS_SCANNED',
//               previousStatus: order.status,
//               completionPercentage: 100,
//             },
//           },
//         });

//         orderStatusUpdated = true;
//       }
//     }

//     return {
//       order: await this.orderRepo.findOne({ id: order.id }),
//       itemScanned: true,
//       orderStatusUpdated,
//       completionStatus,
//     };
//   }

//   // Bulk scan multiple items
//   async bulkScanItems(
//     dto: BulkItemScanDto,
//     signature?: string,
//     rawBody?: Buffer,
//   ): Promise<{
//     success: Array<{ sku: string; orderId: string }>;
//     failed: Array<{ sku: string; error: string }>;
//     ordersUpdated: Array<{ orderId: string; newStatus: OrderStatus }>;
//   }> {
//     this.verifyWebhook(signature, rawBody);

//     if (dto.items.length > this.maxBulkOperations) {
//       throw new BadRequestException(
//         `Bulk operation limited to ${this.maxBulkOperations} items`,
//       );
//     }

//     const results: {
//       success: Array<{ sku: string; orderId: string }>;
//       failed: Array<{ sku: string; error: string }>;
//       ordersUpdated: Array<{ orderId: string; newStatus: OrderStatus }>;
//     } = { success: [], failed: [], ordersUpdated: [] };
//     const processedOrders = new Set<string>();

//     await this.prisma.$transaction(async (tx) => {
//       for (const item of dto.items) {
//         try {
//           // Find order
//           const whereOrder = item.orderId
//             ? { id: item.orderId }
//             : { orderNumber: item.orderNumber };

//           const order = await tx.order.findFirst({
//             where: whereOrder,
//             include: { items: { include: { product: true } } },
//           });

//           if (!order) {
//             results.failed.push({ sku: item.sku, error: 'Order not found' });
//             continue;
//           }

//           // Check if item exists in order
//           const orderItem = order.items.find(
//             (oi: any) => oi.product?.sku === item.sku,
//           );
//           if (!orderItem) {
//             results.failed.push({
//               sku: item.sku,
//               error: `Item with SKU ${item.sku} not found in order ${order.orderNumber}`,
//             });
//             continue;
//           }

//           // Mark order item as scanned
//           await tx.orderItem.update({
//             where: { id: orderItem.id },
//             data: { scannedAt: new Date() } as any,
//           });

//           // Create tracking event
//           await tx.trackingEvent.create({
//             data: {
//               orderId: order.id,
//               updaterId: dto.updaterId,
//               status: dto.status,
//               location: item.location || dto.location,
//               notes: item.notes || `Bulk scan: ${item.sku}`,
//               eventType: 'BULK_ITEM_SCAN',
//               metadata: {
//                 ...dto.metadata,
//                 bulkOperation: true,
//                 scannedItem: {
//                   sku: item.sku,
//                   productId: orderItem.productId,
//                 },
//               },
//             },
//           });

//           results.success.push({ sku: item.sku, orderId: order.id });
//           processedOrders.add(order.id);
//         } catch (error) {
//           results.failed.push({
//             sku: item.sku,
//             error: error.message || 'Unknown error',
//           });
//         }
//       }

//       // Check and update order statuses for all processed orders
//       for (const orderId of processedOrders) {
//         try {
//           const completionStatus =
//             await this.getOrderCompletionStatusInTransaction(tx, orderId);

//           if (
//             completionStatus.canProgressStatus &&
//             completionStatus.scannedItems === completionStatus.totalItems &&
//             completionStatus.suggestedNextStatus
//           ) {
//             const order = await tx.order.findUnique({ where: { id: orderId } });
//             if (
//               order &&
//               VALID_STATUS_TRANSITIONS[order.status]?.includes(
//                 completionStatus.suggestedNextStatus,
//               )
//             ) {
//               await tx.order.update({
//                 where: { id: orderId },
//                 data: {
//                   status: completionStatus.suggestedNextStatus,
//                   ...(completionStatus.suggestedNextStatus ===
//                     OrderStatus.PICKED_UP && { pickedAt: new Date() }),
//                   ...(completionStatus.suggestedNextStatus ===
//                     OrderStatus.DELIVERED && { deliveredAt: new Date() }),
//                 },
//               });

//               await tx.trackingEvent.create({
//                 data: {
//                   orderId,
//                   updaterId: dto.updaterId,
//                   status: completionStatus.suggestedNextStatus,
//                   location: dto.location,
//                   notes:
//                     'Order auto-updated after bulk item scanning completion',
//                   eventType: 'BULK_AUTO_STATUS_UPDATE',
//                   metadata: {
//                     trigger: 'BULK_ALL_ITEMS_SCANNED',
//                     previousStatus: order.status,
//                   },
//                 },
//               });

//               results.ordersUpdated.push({
//                 orderId,
//                 newStatus: completionStatus.suggestedNextStatus,
//               });
//             }
//           }
//         } catch (error) {
//           console.error(`Failed to update order ${orderId} status:`, error);
//         }
//       }
//     });

//     return results;
//   }

//   // Scan entire order by order number (marks all items as scanned)
//   async scanCompleteOrder(
//     dto: ScanUpdateStatusDto,
//     signature?: string,
//     rawBody?: Buffer,
//   ): Promise<IOrder> {
//     this.verifyWebhook(signature, rawBody);

//     const where =
//       dto.codeType === CodeType.ORDER_ID
//         ? { id: dto.code }
//         : { orderNumber: dto.code };

//     const order = await this.prisma.order.findFirst({
//       where: where as any,
//       include: { items: true },
//     });
//     if (!order) throw new NotFoundException('Order not found');

//     if (!VALID_STATUS_TRANSITIONS[order.status]?.includes(dto.status)) {
//       throw new BadRequestException(
//         `Invalid status transition from ${order.status} to ${dto.status}`,
//       );
//     }

//     await this.prisma.$transaction(async (tx) => {
//       // Mark all order items scanned
//       await tx.orderItem.updateMany({
//         where: { orderId: order.id },
//         data: { scannedAt: new Date() } as any,
//       });

//       // Update order status
//       await tx.order.update({
//         where: { id: order.id },
//         data: {
//           status: dto.status,
//           ...(dto.status === OrderStatus.PICKED_UP && { pickedAt: new Date() }),
//           ...(dto.status === OrderStatus.DELIVERED && {
//             deliveredAt: new Date(),
//           }),
//           ...(dto.status === OrderStatus.CANCELLED && {
//             cancelledAt: new Date(),
//           }),
//         },
//       });

//       // Create tracking event for complete order scan
//       await tx.trackingEvent.create({
//         data: {
//           orderId: order.id,
//           updaterId: dto.updaterId,
//           status: dto.status,
//           location: dto.location,
//           latitude: dto.latitude as any,
//           longitude: dto.longitude as any,
//           notes: dto.notes || 'Complete order scanned',
//           eventType: 'COMPLETE_ORDER_SCAN',
//           metadata: {
//             ...dto.metadata,
//             previousStatus: order.status,
//             action: 'COMPLETE_ORDER_SCAN',
//           },
//         },
//       });
//     });

//     return this.orderRepo.findOne({ id: order.id });
//   }

//   // Get order completion status
//   async getOrderCompletionStatus(
//     orderId: string,
//   ): Promise<OrderCompletionStatusDto> {
//     const order = await this.prisma.order.findUnique({
//       where: { id: orderId },
//       include: { items: true },
//     });

//     if (!order) throw new NotFoundException('Order not found');

//     const totalItems = order.items?.length || 0;
//     const scannedItems =
//       order.items?.filter((item: any) => item.scannedAt).length || 0;
//     const pendingItems: string[] = [];

//     const completionPercentage =
//       totalItems > 0 ? Math.round((scannedItems / totalItems) * 100) : 0;

//     // Determine if order can progress and suggest next status
//     const canProgressStatus = completionPercentage === 100;
//     let suggestedNextStatus: OrderStatus | undefined;

//     if (canProgressStatus) {
//     }

//     return {
//       orderId,
//       totalItems,
//       scannedItems,
//       pendingItems,
//       completionPercentage,
//       canProgressStatus,
//       suggestedNextStatus,
//     };
//   }

//   // Helper method for transaction context
//   private async getOrderCompletionStatusInTransaction(
//     tx: any,
//     orderId: string,
//   ): Promise<OrderCompletionStatusDto> {
//     const order = await tx.order.findUnique({
//       where: { id: orderId },
//       include: { items: true },
//     });

//     if (!order) throw new NotFoundException('Order not found');

//     const totalItems = order.items?.length || 0;
//     const scannedItems =
//       order.items?.filter((item: any) => item.scannedAt).length || 0;
//     const pendingItems: string[] = [];

//     const completionPercentage =
//       totalItems > 0 ? Math.round((scannedItems / totalItems) * 100) : 0;
//     const canProgressStatus = completionPercentage === 100;

//     let suggestedNextStatus: OrderStatus | undefined;
//     if (canProgressStatus) {
//     }

//     return {
//       orderId,
//       totalItems,
//       scannedItems,
//       pendingItems,
//       completionPercentage,
//       canProgressStatus,
//       suggestedNextStatus,
//     };
//   }

//   // Reset scanned status for order items (for testing/correction purposes)
//   async resetOrderScanStatus(
//     orderId: string,
//     signature?: string,
//     rawBody?: Buffer,
//   ): Promise<{ resetCount: number; order: IOrder }> {
//     this.verifyWebhook(signature, rawBody);

//     const order = await this.orderRepo.findOne(
//       { id: orderId },
//       { items: { include: { product: true } } },
//     );

//     if (!order) throw new NotFoundException('Order not found');

//     const resetResult = await this.prisma.orderItem.updateMany({
//       where: { orderId },
//       data: { scannedAt: null } as any,
//     });

//     await this.prisma.trackingEvent.create({
//       data: {
//         orderId: order.id,
//         status: order.status,
//         notes: 'Order scan status reset',
//         eventType: 'SCAN_STATUS_RESET',
//         metadata: {
//           itemsReset: resetResult.count,
//         },
//       },
//     });

//     return {
//       resetCount: resetResult.count,
//       order: await this.orderRepo.findOne({ id: orderId }),
//     };
//   }

//   // Existing methods remain the same...
//   async scanCreateOrder(
//     dto: ScanCreateOrderDto,
//     signature?: string,
//     rawBody?: Buffer,
//   ): Promise<IOrder> {
//     this.verifyWebhook(signature, rawBody);

//     if (!dto.orderNumber || !dto.customerId) {
//       throw new BadRequestException(
//         'Order number and customer ID are required',
//       );
//     }

//     const existingOrder = await this.orderRepo.findOne({
//       orderNumber: dto.orderNumber,
//     });
//     if (existingOrder) {
//       throw new BadRequestException('Order with this number already exists');
//     }

//     const itemsWithTotal = (dto.items || []).map((item) => ({
//       sku: item.sku,
//       name: item.name,
//       description: item.description,
//       quantity: item.quantity,
//       unitPrice: item.unitPrice,
//       weight: item.weight,
//       total: item.quantity * item.unitPrice,
//     }));

//     const totalValue = itemsWithTotal.reduce((acc, i) => acc + i.total, 0);
//     const totalWeight = itemsWithTotal.reduce(
//       (acc, i) => acc + (i.weight || 0) * i.quantity,
//       0,
//     );

//     const order = await this.orderRepo.create(
//       {
//         orderNumber: dto.orderNumber,
//         referenceNumber: dto.referenceNumber,
//         customerId: dto.customerId,
//         branchId: dto.branchId,
//         totalValue,
//         totalWeight,
//         status: OrderStatus.CREATED,
//         estimatedDelivery: dto.estimatedDelivery
//           ? new Date(dto.estimatedDelivery)
//           : undefined,
//         items: itemsWithTotal.length ? { create: itemsWithTotal } : undefined,
//       },
//       { items: true },
//     );

//     await this.prisma.trackingEvent.create({
//       data: {
//         orderId: order.id,
//         updaterId: dto.customerId,
//         status: OrderStatus.CREATED,
//         eventType: 'SCAN_CREATE',
//         metadata: {
//           createdViaScanner: true,
//         },
//       },
//     });

//     return order;
//   }

//   // Update status via scan by code (SKU, ORDER_ID, ORDER_NUMBER)
//   async scanUpdateStatus(
//     dto: ScanUpdateStatusDto,
//     signature?: string,
//     rawBody?: Buffer,
//   ): Promise<IOrder> {
//     this.verifyWebhook(signature, rawBody);

//     if (dto.codeType === CodeType.SKU) {
//       // Find order containing this SKU, then treat as single item scan
//       const order = await this.prisma.order.findFirst({
//         where: {
//           items: {
//             some: { product: { is: { sku: dto.code } } },
//           },
//         },
//         include: { items: { include: { product: true } } },
//       });
//       if (!order) throw new NotFoundException('Order not found for SKU');

//       const item = order.items.find((i) => i.product.sku === dto.code);
//       if (!item) throw new NotFoundException('Item not found in order');

//       // Mark as scanned and create tracking
//       await this.prisma.orderItem.updateMany({
//         where: { orderId: order.id },
//         data: { scannedAt: new Date() } as any,
//       });

//       await this.prisma.trackingEvent.create({
//         data: {
//           orderId: order.id,
//           updaterId: dto.updaterId,
//           status: dto.status,
//           location: dto.location,
//           latitude: dto.latitude as any,
//           longitude: dto.longitude as any,
//           notes: dto.notes || `Item scanned: ${dto.code}`,
//           eventType: 'ITEM_SCAN',
//           metadata: {
//             ...dto.metadata,
//             scannedItem: { sku: dto.code, productId: item.productId },
//           },
//         },
//       });

//       // Possibly progress order status
//       const completion = await this.getOrderCompletionStatus(order.id);
//       if (
//         completion.canProgressStatus &&
//         completion.scannedItems === completion.totalItems &&
//         completion.suggestedNextStatus &&
//         VALID_STATUS_TRANSITIONS[order.status]?.includes(
//           completion.suggestedNextStatus,
//         )
//       ) {
//         await this.prisma.order.update({
//           where: { id: order.id },
//           data: {
//             status: completion.suggestedNextStatus,
//             ...(completion.suggestedNextStatus === OrderStatus.PICKED_UP && {
//               pickedAt: new Date(),
//             }),
//             ...(completion.suggestedNextStatus === OrderStatus.DELIVERED && {
//               deliveredAt: new Date(),
//             }),
//           },
//         });

//         await this.prisma.trackingEvent.create({
//           data: {
//             orderId: order.id,
//             updaterId: dto.updaterId,
//             status: completion.suggestedNextStatus,
//             location: dto.location,
//             notes: 'Order status auto-updated after all items scanned',
//             eventType: 'AUTO_STATUS_UPDATE',
//             metadata: {
//               trigger: 'ALL_ITEMS_SCANNED',
//               previousStatus: order.status,
//             },
//           },
//         });
//       }

//       return this.orderRepo.findOne({ id: order.id });
//     }

//     // Complete order scan by id or orderNumber
//     return this.scanCompleteOrder(dto, signature, rawBody);
//   }

//   // Bulk scan update
//   async bulkScanUpdate(
//     dto: BulkScanUpdateDto,
//     signature?: string,
//     rawBody?: Buffer,
//   ): Promise<{
//     success: Array<{ code: string; orderId: string }>;
//     failed: Array<{ code: string; error: string }>;
//     ordersUpdated: Array<{ orderId: string; newStatus: OrderStatus }>;
//   }> {
//     this.verifyWebhook(signature, rawBody);

//     const results: {
//       success: Array<{ code: string; orderId: string }>;
//       failed: Array<{ code: string; error: string }>;
//       ordersUpdated: Array<{ orderId: string; newStatus: OrderStatus }>;
//     } = { success: [], failed: [], ordersUpdated: [] };
//     const processedOrders = new Set<string>();

//     await this.prisma.$transaction(async (tx) => {
//       for (const item of dto.items || []) {
//         try {
//           if (item.codeType === CodeType.SKU) {
//             const order = await tx.order.findFirst({
//               where: {
//                 items: { some: { product: { is: { sku: item.code } } } },
//               },
//               include: { items: { include: { product: true } } },
//             });
//             if (!order) throw new NotFoundException('Order not found for SKU');
//             const oi = order.items.find(
//               (i: any) => i.product?.sku === item.code,
//             );
//             if (!oi) throw new NotFoundException('Item not found in order');
//             await tx.orderItem.update({
//               where: { id: oi.id },
//               data: { scannedAt: new Date() } as any,
//             });
//             await tx.trackingEvent.create({
//               data: {
//                 orderId: order.id,
//                 updaterId: dto.updaterId,
//                 status: item.status,
//                 location: item.location,
//                 notes: item.notes || `Bulk scan: ${item.code}`,
//                 eventType: 'BULK_ITEM_SCAN',
//                 metadata: {
//                   bulkOperation: true,
//                   scannedItem: { sku: item.code, orderItemId: oi.id },
//                 },
//               },
//             });
//             results.success.push({ code: item.code, orderId: order.id });
//             processedOrders.add(order.id);
//           } else {
//             // Full order update
//             const where =
//               item.codeType === CodeType.ORDER_ID
//                 ? { id: item.code }
//                 : { orderNumber: item.code };
//             const order = await tx.order.findFirst({
//               where,
//               include: { items: { include: { product: true } } },
//             });
//             if (!order) throw new NotFoundException('Order not found');
//             // Mark all order items as scanned
//             await tx.orderItem.updateMany({
//               where: { orderId: order.id },
//               data: { scannedAt: new Date() } as any,
//             });
//             await tx.order.update({
//               where: { id: order.id },
//               data: {
//                 status: item.status,
//                 ...(item.status === OrderStatus.PICKED_UP && {
//                   pickedAt: new Date(),
//                 }),
//                 ...(item.status === OrderStatus.DELIVERED && {
//                   deliveredAt: new Date(),
//                 }),
//                 ...(item.status === OrderStatus.CANCELLED && {
//                   cancelledAt: new Date(),
//                 }),
//               },
//             });
//             await tx.trackingEvent.create({
//               data: {
//                 orderId: order.id,
//                 updaterId: dto.updaterId,
//                 status: item.status,
//                 location: item.location,
//                 notes: item.notes || 'Complete order scanned (bulk)',
//                 eventType: 'COMPLETE_ORDER_SCAN',
//                 metadata: { bulkOperation: true, previousStatus: order.status },
//               },
//             });
//             results.success.push({ code: item.code, orderId: order.id });
//             processedOrders.add(order.id);
//           }
//         } catch (e: any) {
//           results.failed.push({
//             code: item.code,
//             error: e.message || 'Unknown error',
//           });
//         }
//       }

//       // Post-process orders for auto progress
//       for (const orderId of processedOrders) {
//         try {
//           const completion = await this.getOrderCompletionStatusInTransaction(
//             tx,
//             orderId,
//           );
//           if (
//             completion.canProgressStatus &&
//             completion.scannedItems === completion.totalItems &&
//             completion.suggestedNextStatus
//           ) {
//             const order = await tx.order.findUnique({ where: { id: orderId } });
//             if (
//               order &&
//               VALID_STATUS_TRANSITIONS[order.status]?.includes(
//                 completion.suggestedNextStatus,
//               )
//             ) {
//               await tx.order.update({
//                 where: { id: orderId },
//                 data: {
//                   status: completion.suggestedNextStatus,
//                   ...(completion.suggestedNextStatus ===
//                     OrderStatus.PICKED_UP && {
//                     pickedAt: new Date(),
//                   }),
//                   ...(completion.suggestedNextStatus ===
//                     OrderStatus.DELIVERED && {
//                     deliveredAt: new Date(),
//                   }),
//                 },
//               });
//               results.ordersUpdated.push({
//                 orderId,
//                 newStatus: completion.suggestedNextStatus,
//               });
//             }
//           }
//         } catch (err) {
//           // ignore per-order errors here
//         }
//       }
//     });

//     return results;
//   }

//   // Basic scan history (tracking events) query
//   async getScanHistory(query: ScanHistoryQueryDto) {
//     const where: any = {};
//     if (query.orderId) where.orderId = query.orderId;
//     if (query.updaterId) where.updaterId = query.updaterId;
//     if (query.status) where.status = query.status;
//     if (query.dateFrom || query.dateTo) {
//       where.timestamp = {} as any;
//       if (query.dateFrom) where.timestamp.gte = new Date(query.dateFrom);
//       if (query.dateTo) where.timestamp.lte = new Date(query.dateTo);
//     }
//     const limit = Math.min(Math.max(Number(query.limit ?? 50) || 50, 1), 500);
//     return this.prisma.trackingEvent.findMany({
//       where,
//       orderBy: { timestamp: 'desc' },
//       take: limit,
//     });
//   }

//   async getOrderScanSummary(orderId: string) {
//     const completion = await this.getOrderCompletionStatus(orderId);
//     const recentEvents = await this.prisma.trackingEvent.findMany({
//       where: { orderId },
//       orderBy: { timestamp: 'desc' },
//       take: 10,
//     });
//     return { completion, recentEvents };
//   }
// }

// import { Injectable } from '@nestjs/common';
// import { BaseRepository } from '../../shared/factory/base.repository';
// import { IOrder } from './interfaces/order.interface';
// import { PrismaService } from 'src/db/prisma/prisma.service';
// import { Prisma, OrderStatus } from '@prisma/client';

// @Injectable()
// export class OrderRepository extends BaseRepository<IOrder> {
//   constructor(protected readonly prisma: PrismaService) {
//     super(prisma, 'order', ['orderNumber'], {
//       pickup: true,
//       customer: true,
//       items: true,
//     });
//   }

//   private async resolveProductsBySku(
//     items: Array<any>,
//   ): Promise<Record<string, string>> {
//     const productIdBySku: Record<string, string> = {};
//     const itemsWithSku = items.filter((i) => i.sku && !i.productId);

//     if (!itemsWithSku.length) return productIdBySku;

//     await Promise.all(
//       itemsWithSku.map(async (i) => {
//         const product = await this.prisma.product.upsert({
//           where: { sku: i.sku! },
//           update: {
//             name: i.name,
//             description: i.description,
//             weight: i.weight as any,
//           },
//           create: {
//             sku: i.sku!,
//             name: i.name,
//             description: i.description,
//             weight: i.weight as any,
//           },
//         });
//         productIdBySku[i.sku!] = product.id;
//       }),
//     );

//     return productIdBySku;
//   }

//   private async prepareItems(
//     itemsInput: Array<any>,
//   ): Promise<Prisma.OrderItemCreateWithoutOrderInput[]> {
//     if (!itemsInput?.length) return [];

//     const productIdBySku = await this.resolveProductsBySku(itemsInput);

//     return itemsInput
//       .filter((i) => i.productId || (i.sku && productIdBySku[i.sku!]))
//       .map((i) => ({
//         product: {
//           connect: {
//             id: i.productId ?? productIdBySku[i.sku!],
//           },
//         },
//         quantity: i.quantity,
//         unitPrice: i.unitPrice,
//         total: i.quantity * i.unitPrice,
//       }));
//   }

//   private computeTotals(
//     items: Prisma.OrderItemCreateWithoutOrderInput[],
//     rawItems: Array<any>,
//     dtoTotals?: { totalValue?: number; totalWeight?: number },
//   ) {
//     const totalValue =
//       dtoTotals?.totalValue ??
//       items.reduce((acc, it) => acc + Number(it.total), 0);

//     const totalWeight =
//       dtoTotals?.totalWeight ??
//       rawItems.reduce(
//         (acc, it) => acc + Number(it.weight || 0) * it.quantity,
//         0,
//       );

//     return { totalValue, totalWeight };
//   }

//   async createWithItems(dto: any): Promise<IOrder> {
//     const prismaItems = await this.prepareItems(dto.items || []);
//     const { totalValue, totalWeight } = this.computeTotals(
//       prismaItems,
//       dto.items || [],
//       dto,
//     );

//     const payload: Prisma.OrderCreateInput = {
//       orderNumber: dto.orderNumber,
//       customer: dto.customerId
//         ? {
//             connect: { id: dto.customerId },
//           }
//         : undefined,
//       status: dto.status ?? OrderStatus.PENDING,
//       failedReason: dto.failedReason,
//       priority: dto.priority,
//       specialInstructions: dto.specialInstructions,
//       estimatedDelivery: dto.estimatedDelivery
//         ? new Date(dto.estimatedDelivery)
//         : undefined,
//       totalValue,
//       totalWeight,
//       items: prismaItems.length ? { create: prismaItems } : undefined,
//     };

//     return this.create(payload, { items: true, customer: true });
//   }

//   async updateWithItems(id: string, dto: any): Promise<IOrder> {
//     const prismaItems = await this.prepareItems(dto.items || []);
//     const { totalValue, totalWeight } = this.computeTotals(
//       prismaItems,
//       dto.items || [],
//       dto,
//     );

//     const { items: _omit, ...rest } = dto;
//     const payload: Prisma.OrderUpdateInput = {
//       ...rest,
//       totalValue,
//       totalWeight,
//       items: {
//         deleteMany: {}, // clear old items
//         ...(prismaItems.length ? { create: prismaItems } : {}),
//       },
//     };

//     return this.update(id, payload, { items: true, customer: true });
//   }
// }

// import {
//   Injectable,
//   NotFoundException,
//   BadRequestException,
// } from '@nestjs/common';
// import { OrderRepository } from './order.repository';
// import { IOrder } from './interfaces/order.interface';
// import { CreateOrderDto } from './dto/create-order.dto';
// import { UpdateOrderDto } from './dto/update-order.dto';
// import { OrderStatus } from '@prisma/client';
// import {
//   ScanUpdateStatusDto,
//   BulkScanUpdateDto,
//   ScanHistoryQueryDto,
//   CodeType,
// } from './dto/scan-update-status.dto';
// import { ScanCreateOrderDto } from './dto/scan-create-order.dto';
// import { PrismaService } from 'src/db/prisma/prisma.service';
// import { ConfigService } from '@nestjs/config';
// import {
//   computeHmacSha256,
//   safeTimingEqual,
// } from '../../common/utils/hmac.util';
// import { AuthUser } from '../auth/interfaces/auth-user.interface';
// import { BulkItemScanDto } from './dto/bulk-item-scan.dto';
// import { OrderCompletionStatusDto } from './dto/order-completion-status.dto';
// import { ScanItemDto } from './dto/scan-item.dto';
// import { VALID_STATUS_TRANSITIONS } from './constants/status-transitions.const';

// @Injectable()
// export class OrderService {
//   private readonly maxBulkOperations = 100;
//   constructor(
//     private readonly orderRepo: OrderRepository,
//     private readonly prisma: PrismaService,
//     private readonly config: ConfigService,
//   ) {}

//   async create(user: AuthUser, dto: CreateOrderDto): Promise<IOrder> {
//     return this.orderRepo.createWithItems({
//       ...dto,
//       customerId: user.id,
//     });
//   }

//   async update(id: string, dto: UpdateOrderDto): Promise<IOrder> {
//     return dto.items !== undefined
//       ? this.orderRepo.updateWithItems(id, dto)
//       : this.orderRepo.update(id, dto, { items: true, customer: true });
//   }

//   async findAll(query: Record<string, any>) {
//     return this.orderRepo.findAll(query);
//   }

//   async findOne(id: string): Promise<IOrder | null> {
//     return this.orderRepo.findOne({ id });
//   }

//   async getCustomerOrders(customerId: string, query: Record<string, any> = {}) {
//     return this.orderRepo.findAll(query, { customerId });
//   }

//   async delete(id: string): Promise<void> {
//     return this.orderRepo.delete(id);
//   }

//   async findOneBySku(sku: string) {
//     return this.orderRepo.findOne({ sku });
//   }

//   async getTenantOrders(query: Record<string, any>, tenantId: string) {
//     return this.orderRepo.findAll(query, {
//       customer: {
//         is: {
//           memberships: { some: { tenantId, deletedAt: null } },
//           deletedAt: null,
//         },
//       },
//     });
//   }

//   private verifyWebhook(signature?: string, rawBody?: Buffer) {
//     const secret = this.config.get<string>('WEBHOOK_HMAC_SECRET');
//     if (secret && rawBody) {
//       const expected = computeHmacSha256(secret, rawBody);
//       if (!signature || !safeTimingEqual(expected, signature)) {
//         throw new NotFoundException('Invalid webhook signature');
//       }
//     }
//   }

//   // Scan individual item and check if order should be updated
//   async scanItem(
//     dto: ScanItemDto,
//     signature?: string,
//     rawBody?: Buffer,
//   ): Promise<{
//     order: IOrder;
//     itemScanned: boolean;
//     orderStatusUpdated: boolean;
//     completionStatus: OrderCompletionStatusDto;
//   }> {
//     this.verifyWebhook(signature, rawBody);

//     // Find order by ID or order number
//     const whereOrder = dto.orderId
//       ? { id: dto.orderId }
//       : { orderNumber: dto.orderNumber };

//     const order = await this.prisma.order.findFirst({
//       where: whereOrder as any,
//       include: { items: { include: { product: true } } },
//     });
//     if (!order) throw new NotFoundException('Order not found');

//     // Find the specific item by SKU
//     const orderItem = order.items?.find(
//       (item: any) => item.product?.sku === dto.sku,
//     );
//     if (!orderItem) {
//       throw new NotFoundException(
//         `Item with SKU ${dto.sku} not found in this order`,
//       );
//     }

//     // Mark order item as scanned
//     await this.prisma.orderItem.update({
//       where: { id: (orderItem as any).id },
//       data: { scannedAt: new Date() } as any,
//     });

//     // Create tracking event for item scan
//     await this.prisma.trackingEvent.create({
//       data: {
//         orderId: order.id,
//         updaterId: dto.updaterId,
//         status: dto.status,
//         location: dto.location,
//         latitude: dto.latitude as any,
//         longitude: dto.longitude as any,
//         notes: dto.notes || `Item scanned: ${dto.sku}`,
//         eventType: 'ITEM_SCAN',
//         metadata: {
//           ...dto.metadata,
//           scannedItem: {
//             sku: dto.sku,
//             orderItemId: (orderItem as any).id,
//             quantity: (orderItem as any).quantity,
//           },
//         },
//       },
//     });

//     // Check completion status
//     const completionStatus = await this.getOrderCompletionStatus(order.id);
//     let orderStatusUpdated = false;

//     // Auto-update order status if all items are scanned and status allows progression
//     if (
//       completionStatus.canProgressStatus &&
//       completionStatus.scannedItems === completionStatus.totalItems
//     ) {
//       if (
//         completionStatus.suggestedNextStatus &&
//         VALID_STATUS_TRANSITIONS[order.status]?.includes(
//           completionStatus.suggestedNextStatus,
//         )
//       ) {
//         await this.orderRepo.update(order.id, {
//           status: completionStatus.suggestedNextStatus,
//           ...(completionStatus.suggestedNextStatus ===
//             OrderStatus.PICKED_UP && { pickedAt: new Date() }),
//           ...(completionStatus.suggestedNextStatus ===
//             OrderStatus.DELIVERED && { deliveredAt: new Date() }),
//         });

//         // Create tracking event for order status update
//         await this.prisma.trackingEvent.create({
//           data: {
//             orderId: order.id,
//             updaterId: dto.updaterId,
//             status: completionStatus.suggestedNextStatus,
//             location: dto.location,
//             latitude: dto.latitude as any,
//             longitude: dto.longitude as any,
//             notes: 'Order status auto-updated after all items scanned',
//             eventType: 'AUTO_STATUS_UPDATE',
//             metadata: {
//               trigger: 'ALL_ITEMS_SCANNED',
//               previousStatus: order.status,
//               completionPercentage: 100,
//             },
//           },
//         });

//         orderStatusUpdated = true;
//       }
//     }

//     return {
//       order: await this.orderRepo.findOne({ id: order.id }),
//       itemScanned: true,
//       orderStatusUpdated,
//       completionStatus,
//     };
//   }

//   // Bulk scan multiple items
//   async bulkScanItems(
//     dto: BulkItemScanDto,
//     signature?: string,
//     rawBody?: Buffer,
//   ): Promise<{
//     success: Array<{ sku: string; orderId: string }>;
//     failed: Array<{ sku: string; error: string }>;
//     ordersUpdated: Array<{ orderId: string; newStatus: OrderStatus }>;
//   }> {
//     this.verifyWebhook(signature, rawBody);

//     if (dto.items.length > this.maxBulkOperations) {
//       throw new BadRequestException(
//         `Bulk operation limited to ${this.maxBulkOperations} items`,
//       );
//     }

//     const results: {
//       success: Array<{ sku: string; orderId: string }>;
//       failed: Array<{ sku: string; error: string }>;
//       ordersUpdated: Array<{ orderId: string; newStatus: OrderStatus }>;
//     } = { success: [], failed: [], ordersUpdated: [] };
//     const processedOrders = new Set<string>();

//     await this.prisma.$transaction(async (tx) => {
//       for (const item of dto.items) {
//         try {
//           // Find order
//           const whereOrder = item.orderId
//             ? { id: item.orderId }
//             : { orderNumber: item.orderNumber };

//           const order = await tx.order.findFirst({
//             where: whereOrder,
//             include: { items: { include: { product: true } } },
//           });

//           if (!order) {
//             results.failed.push({ sku: item.sku, error: 'Order not found' });
//             continue;
//           }

//           // Check if item exists in order
//           const orderItem = order.items.find(
//             (oi: any) => oi.product?.sku === item.sku,
//           );
//           if (!orderItem) {
//             results.failed.push({
//               sku: item.sku,
//               error: `Item with SKU ${item.sku} not found in order ${order.orderNumber}`,
//             });
//             continue;
//           }

//           // Mark order item as scanned
//           await tx.orderItem.update({
//             where: { id: orderItem.id },
//             data: { scannedAt: new Date() } as any,
//           });

//           // Create tracking event
//           await tx.trackingEvent.create({
//             data: {
//               orderId: order.id,
//               updaterId: dto.updaterId,
//               status: dto.status,
//               location: item.location || dto.location,
//               notes: item.notes || `Bulk scan: ${item.sku}`,
//               eventType: 'BULK_ITEM_SCAN',
//               metadata: {
//                 ...dto.metadata,
//                 bulkOperation: true,
//                 scannedItem: {
//                   sku: item.sku,
//                   productId: orderItem.productId,
//                 },
//               },
//             },
//           });

//           results.success.push({ sku: item.sku, orderId: order.id });
//           processedOrders.add(order.id);
//         } catch (error) {
//           results.failed.push({
//             sku: item.sku,
//             error: error.message || 'Unknown error',
//           });
//         }
//       }

//       // Check and update order statuses for all processed orders
//       for (const orderId of processedOrders) {
//         try {
//           const completionStatus =
//             await this.getOrderCompletionStatusInTransaction(tx, orderId);

//           if (
//             completionStatus.canProgressStatus &&
//             completionStatus.scannedItems === completionStatus.totalItems &&
//             completionStatus.suggestedNextStatus
//           ) {
//             const order = await tx.order.findUnique({ where: { id: orderId } });
//             if (
//               order &&
//               VALID_STATUS_TRANSITIONS[order.status]?.includes(
//                 completionStatus.suggestedNextStatus,
//               )
//             ) {
//               await tx.order.update({
//                 where: { id: orderId },
//                 data: {
//                   status: completionStatus.suggestedNextStatus,
//                   ...(completionStatus.suggestedNextStatus ===
//                     OrderStatus.PICKED_UP && { pickedAt: new Date() }),
//                   ...(completionStatus.suggestedNextStatus ===
//                     OrderStatus.DELIVERED && { deliveredAt: new Date() }),
//                 },
//               });

//               await tx.trackingEvent.create({
//                 data: {
//                   orderId,
//                   updaterId: dto.updaterId,
//                   status: completionStatus.suggestedNextStatus,
//                   location: dto.location,
//                   notes:
//                     'Order auto-updated after bulk item scanning completion',
//                   eventType: 'BULK_AUTO_STATUS_UPDATE',
//                   metadata: {
//                     trigger: 'BULK_ALL_ITEMS_SCANNED',
//                     previousStatus: order.status,
//                   },
//                 },
//               });

//               results.ordersUpdated.push({
//                 orderId,
//                 newStatus: completionStatus.suggestedNextStatus,
//               });
//             }
//           }
//         } catch (error) {
//           console.error(`Failed to update order ${orderId} status:`, error);
//         }
//       }
//     });

//     return results;
//   }

//   // Scan entire order by order number (marks all items as scanned)
//   async scanCompleteOrder(
//     dto: ScanUpdateStatusDto,
//     signature?: string,
//     rawBody?: Buffer,
//   ): Promise<IOrder> {
//     this.verifyWebhook(signature, rawBody);

//     const where =
//       dto.codeType === CodeType.ORDER_ID
//         ? { id: dto.code }
//         : { orderNumber: dto.code };

//     const order = await this.prisma.order.findFirst({
//       where: where as any,
//       include: { items: true },
//     });
//     if (!order) throw new NotFoundException('Order not found');

//     if (!VALID_STATUS_TRANSITIONS[order.status]?.includes(dto.status)) {
//       throw new BadRequestException(
//         `Invalid status transition from ${order.status} to ${dto.status}`,
//       );
//     }

//     await this.prisma.$transaction(async (tx) => {
//       // Mark all order items scanned
//       await tx.orderItem.updateMany({
//         where: { orderId: order.id },
//         data: { scannedAt: new Date() } as any,
//       });

//       // Update order status
//       await tx.order.update({
//         where: { id: order.id },
//         data: {
//           status: dto.status,
//           ...(dto.status === OrderStatus.PICKED_UP && { pickedAt: new Date() }),
//           ...(dto.status === OrderStatus.DELIVERED && {
//             deliveredAt: new Date(),
//           }),
//           ...(dto.status === OrderStatus.CANCELLED && {
//             cancelledAt: new Date(),
//           }),
//         },
//       });

//       // Create tracking event for complete order scan
//       await tx.trackingEvent.create({
//         data: {
//           orderId: order.id,
//           updaterId: dto.updaterId,
//           status: dto.status,
//           location: dto.location,
//           latitude: dto.latitude as any,
//           longitude: dto.longitude as any,
//           notes: dto.notes || 'Complete order scanned',
//           eventType: 'COMPLETE_ORDER_SCAN',
//           metadata: {
//             ...dto.metadata,
//             previousStatus: order.status,
//             action: 'COMPLETE_ORDER_SCAN',
//           },
//         },
//       });
//     });

//     return this.orderRepo.findOne({ id: order.id });
//   }

//   // Get order completion status
//   async getOrderCompletionStatus(
//     orderId: string,
//   ): Promise<OrderCompletionStatusDto> {
//     const order = await this.prisma.order.findUnique({
//       where: { id: orderId },
//       include: { items: true },
//     });

//     if (!order) throw new NotFoundException('Order not found');

//     const totalItems = order.items?.length || 0;
//     const scannedItems =
//       order.items?.filter((item: any) => item.scannedAt).length || 0;
//     const pendingItems: string[] = [];

//     const completionPercentage =
//       totalItems > 0 ? Math.round((scannedItems / totalItems) * 100) : 0;

//     // Determine if order can progress and suggest next status
//     const canProgressStatus = completionPercentage === 100;
//     let suggestedNextStatus: OrderStatus | undefined;

//     if (canProgressStatus) {
//     }

//     return {
//       orderId,
//       totalItems,
//       scannedItems,
//       pendingItems,
//       completionPercentage,
//       canProgressStatus,
//       suggestedNextStatus,
//     };
//   }

//   // Helper method for transaction context
//   private async getOrderCompletionStatusInTransaction(
//     tx: any,
//     orderId: string,
//   ): Promise<OrderCompletionStatusDto> {
//     const order = await tx.order.findUnique({
//       where: { id: orderId },
//       include: { items: true },
//     });

//     if (!order) throw new NotFoundException('Order not found');

//     const totalItems = order.items?.length || 0;
//     const scannedItems =
//       order.items?.filter((item: any) => item.scannedAt).length || 0;
//     const pendingItems: string[] = [];

//     const completionPercentage =
//       totalItems > 0 ? Math.round((scannedItems / totalItems) * 100) : 0;
//     const canProgressStatus = completionPercentage === 100;

//     let suggestedNextStatus: OrderStatus | undefined;
//     if (canProgressStatus) {
//     }

//     return {
//       orderId,
//       totalItems,
//       scannedItems,
//       pendingItems,
//       completionPercentage,
//       canProgressStatus,
//       suggestedNextStatus,
//     };
//   }

//   // Reset scanned status for order items (for testing/correction purposes)
//   async resetOrderScanStatus(
//     orderId: string,
//     signature?: string,
//     rawBody?: Buffer,
//   ): Promise<{ resetCount: number; order: IOrder }> {
//     this.verifyWebhook(signature, rawBody);

//     const order = await this.orderRepo.findOne(
//       { id: orderId },
//       { items: { include: { product: true } } },
//     );

//     if (!order) throw new NotFoundException('Order not found');

//     const resetResult = await this.prisma.orderItem.updateMany({
//       where: { orderId },
//       data: { scannedAt: null } as any,
//     });

//     await this.prisma.trackingEvent.create({
//       data: {
//         orderId: order.id,
//         status: order.status,
//         notes: 'Order scan status reset',
//         eventType: 'SCAN_STATUS_RESET',
//         metadata: {
//           itemsReset: resetResult.count,
//         },
//       },
//     });

//     return {
//       resetCount: resetResult.count,
//       order: await this.orderRepo.findOne({ id: orderId }),
//     };
//   }

//   // Existing methods remain the same...
//   async scanCreateOrder(
//     dto: ScanCreateOrderDto,
//     signature?: string,
//     rawBody?: Buffer,
//   ): Promise<IOrder> {
//     this.verifyWebhook(signature, rawBody);

//     if (!dto.orderNumber || !dto.customerId) {
//       throw new BadRequestException(
//         'Order number and customer ID are required',
//       );
//     }

//     const existingOrder = await this.orderRepo.findOne({
//       orderNumber: dto.orderNumber,
//     });
//     if (existingOrder) {
//       throw new BadRequestException('Order with this number already exists');
//     }

//     const itemsWithTotal = (dto.items || []).map((item) => ({
//       sku: item.sku,
//       name: item.name,
//       description: item.description,
//       quantity: item.quantity,
//       unitPrice: item.unitPrice,
//       weight: item.weight,
//       total: item.quantity * item.unitPrice,
//     }));

//     const totalValue = itemsWithTotal.reduce((acc, i) => acc + i.total, 0);
//     const totalWeight = itemsWithTotal.reduce(
//       (acc, i) => acc + (i.weight || 0) * i.quantity,
//       0,
//     );

//     const order = await this.orderRepo.create(
//       {
//         orderNumber: dto.orderNumber,
//         referenceNumber: dto.referenceNumber,
//         customerId: dto.customerId,
//         branchId: dto.branchId,
//         totalValue,
//         totalWeight,
//         status: OrderStatus.CREATED,
//         estimatedDelivery: dto.estimatedDelivery
//           ? new Date(dto.estimatedDelivery)
//           : undefined,
//         items: itemsWithTotal.length ? { create: itemsWithTotal } : undefined,
//       },
//       { items: true },
//     );

//     await this.prisma.trackingEvent.create({
//       data: {
//         orderId: order.id,
//         updaterId: dto.customerId,
//         status: OrderStatus.CREATED,
//         eventType: 'SCAN_CREATE',
//         metadata: {
//           createdViaScanner: true,
//         },
//       },
//     });

//     return order;
//   }

//   // Update status via scan by code (SKU, ORDER_ID, ORDER_NUMBER)
//   async scanUpdateStatus(
//     dto: ScanUpdateStatusDto,
//     signature?: string,
//     rawBody?: Buffer,
//   ): Promise<IOrder> {
//     this.verifyWebhook(signature, rawBody);

//     if (dto.codeType === CodeType.SKU) {
//       // Find order containing this SKU, then treat as single item scan
//       const order = await this.prisma.order.findFirst({
//         where: {
//           items: {
//             some: { product: { is: { sku: dto.code } } },
//           },
//         },
//         include: { items: { include: { product: true } } },
//       });
//       if (!order) throw new NotFoundException('Order not found for SKU');

//       const item = order.items.find((i) => i.product.sku === dto.code);
//       if (!item) throw new NotFoundException('Item not found in order');

//       // Mark as scanned and create tracking
//       await this.prisma.orderItem.updateMany({
//         where: { orderId: order.id },
//         data: { scannedAt: new Date() } as any,
//       });

//       await this.prisma.trackingEvent.create({
//         data: {
//           orderId: order.id,
//           updaterId: dto.updaterId,
//           status: dto.status,
//           location: dto.location,
//           latitude: dto.latitude as any,
//           longitude: dto.longitude as any,
//           notes: dto.notes || `Item scanned: ${dto.code}`,
//           eventType: 'ITEM_SCAN',
//           metadata: {
//             ...dto.metadata,
//             scannedItem: { sku: dto.code, productId: item.productId },
//           },
//         },
//       });

//       // Possibly progress order status
//       const completion = await this.getOrderCompletionStatus(order.id);
//       if (
//         completion.canProgressStatus &&
//         completion.scannedItems === completion.totalItems &&
//         completion.suggestedNextStatus &&
//         VALID_STATUS_TRANSITIONS[order.status]?.includes(
//           completion.suggestedNextStatus,
//         )
//       ) {
//         await this.prisma.order.update({
//           where: { id: order.id },
//           data: {
//             status: completion.suggestedNextStatus,
//             ...(completion.suggestedNextStatus === OrderStatus.PICKED_UP && {
//               pickedAt: new Date(),
//             }),
//             ...(completion.suggestedNextStatus === OrderStatus.DELIVERED && {
//               deliveredAt: new Date(),
//             }),
//           },
//         });

//         await this.prisma.trackingEvent.create({
//           data: {
//             orderId: order.id,
//             updaterId: dto.updaterId,
//             status: completion.suggestedNextStatus,
//             location: dto.location,
//             notes: 'Order status auto-updated after all items scanned',
//             eventType: 'AUTO_STATUS_UPDATE',
//             metadata: {
//               trigger: 'ALL_ITEMS_SCANNED',
//               previousStatus: order.status,
//             },
//           },
//         });
//       }

//       return this.orderRepo.findOne({ id: order.id });
//     }

//     // Complete order scan by id or orderNumber
//     return this.scanCompleteOrder(dto, signature, rawBody);
//   }

//   // Bulk scan update
//   async bulkScanUpdate(
//     dto: BulkScanUpdateDto,
//     signature?: string,
//     rawBody?: Buffer,
//   ): Promise<{
//     success: Array<{ code: string; orderId: string }>;
//     failed: Array<{ code: string; error: string }>;
//     ordersUpdated: Array<{ orderId: string; newStatus: OrderStatus }>;
//   }> {
//     this.verifyWebhook(signature, rawBody);

//     const results: {
//       success: Array<{ code: string; orderId: string }>;
//       failed: Array<{ code: string; error: string }>;
//       ordersUpdated: Array<{ orderId: string; newStatus: OrderStatus }>;
//     } = { success: [], failed: [], ordersUpdated: [] };
//     const processedOrders = new Set<string>();

//     await this.prisma.$transaction(async (tx) => {
//       for (const item of dto.items || []) {
//         try {
//           if (item.codeType === CodeType.SKU) {
//             const order = await tx.order.findFirst({
//               where: {
//                 items: { some: { product: { is: { sku: item.code } } } },
//               },
//               include: { items: { include: { product: true } } },
//             });
//             if (!order) throw new NotFoundException('Order not found for SKU');
//             const oi = order.items.find(
//               (i: any) => i.product?.sku === item.code,
//             );
//             if (!oi) throw new NotFoundException('Item not found in order');
//             await tx.orderItem.update({
//               where: { id: oi.id },
//               data: { scannedAt: new Date() } as any,
//             });
//             await tx.trackingEvent.create({
//               data: {
//                 orderId: order.id,
//                 updaterId: dto.updaterId,
//                 status: item.status,
//                 location: item.location,
//                 notes: item.notes || `Bulk scan: ${item.code}`,
//                 eventType: 'BULK_ITEM_SCAN',
//                 metadata: {
//                   bulkOperation: true,
//                   scannedItem: { sku: item.code, orderItemId: oi.id },
//                 },
//               },
//             });
//             results.success.push({ code: item.code, orderId: order.id });
//             processedOrders.add(order.id);
//           } else {
//             // Full order update
//             const where =
//               item.codeType === CodeType.ORDER_ID
//                 ? { id: item.code }
//                 : { orderNumber: item.code };
//             const order = await tx.order.findFirst({
//               where,
//               include: { items: { include: { product: true } } },
//             });
//             if (!order) throw new NotFoundException('Order not found');
//             // Mark all order items as scanned
//             await tx.orderItem.updateMany({
//               where: { orderId: order.id },
//               data: { scannedAt: new Date() } as any,
//             });
//             await tx.order.update({
//               where: { id: order.id },
//               data: {
//                 status: item.status,
//                 ...(item.status === OrderStatus.PICKED_UP && {
//                   pickedAt: new Date(),
//                 }),
//                 ...(item.status === OrderStatus.DELIVERED && {
//                   deliveredAt: new Date(),
//                 }),
//                 ...(item.status === OrderStatus.CANCELLED && {
//                   cancelledAt: new Date(),
//                 }),
//               },
//             });
//             await tx.trackingEvent.create({
//               data: {
//                 orderId: order.id,
//                 updaterId: dto.updaterId,
//                 status: item.status,
//                 location: item.location,
//                 notes: item.notes || 'Complete order scanned (bulk)',
//                 eventType: 'COMPLETE_ORDER_SCAN',
//                 metadata: { bulkOperation: true, previousStatus: order.status },
//               },
//             });
//             results.success.push({ code: item.code, orderId: order.id });
//             processedOrders.add(order.id);
//           }
//         } catch (e: any) {
//           results.failed.push({
//             code: item.code,
//             error: e.message || 'Unknown error',
//           });
//         }
//       }

//       // Post-process orders for auto progress
//       for (const orderId of processedOrders) {
//         try {
//           const completion = await this.getOrderCompletionStatusInTransaction(
//             tx,
//             orderId,
//           );
//           if (
//             completion.canProgressStatus &&
//             completion.scannedItems === completion.totalItems &&
//             completion.suggestedNextStatus
//           ) {
//             const order = await tx.order.findUnique({ where: { id: orderId } });
//             if (
//               order &&
//               VALID_STATUS_TRANSITIONS[order.status]?.includes(
//                 completion.suggestedNextStatus,
//               )
//             ) {
//               await tx.order.update({
//                 where: { id: orderId },
//                 data: {
//                   status: completion.suggestedNextStatus,
//                   ...(completion.suggestedNextStatus ===
//                     OrderStatus.PICKED_UP && {
//                     pickedAt: new Date(),
//                   }),
//                   ...(completion.suggestedNextStatus ===
//                     OrderStatus.DELIVERED && {
//                     deliveredAt: new Date(),
//                   }),
//                 },
//               });
//               results.ordersUpdated.push({
//                 orderId,
//                 newStatus: completion.suggestedNextStatus,
//               });
//             }
//           }
//         } catch (err) {
//           // ignore per-order errors here
//         }
//       }
//     });

//     return results;
//   }

//   // Basic scan history (tracking events) query
//   async getScanHistory(query: ScanHistoryQueryDto) {
//     const where: any = {};
//     if (query.orderId) where.orderId = query.orderId;
//     if (query.updaterId) where.updaterId = query.updaterId;
//     if (query.status) where.status = query.status;
//     if (query.dateFrom || query.dateTo) {
//       where.timestamp = {} as any;
//       if (query.dateFrom) where.timestamp.gte = new Date(query.dateFrom);
//       if (query.dateTo) where.timestamp.lte = new Date(query.dateTo);
//     }
//     const limit = Math.min(Math.max(Number(query.limit ?? 50) || 50, 1), 500);
//     return this.prisma.trackingEvent.findMany({
//       where,
//       orderBy: { timestamp: 'desc' },
//       take: limit,
//     });
//   }

//   async getOrderScanSummary(orderId: string) {
//     const completion = await this.getOrderCompletionStatus(orderId);
//     const recentEvents = await this.prisma.trackingEvent.findMany({
//       where: { orderId },
//       orderBy: { timestamp: 'desc' },
//       take: 10,
//     });
//     return { completion, recentEvents };
//   }
// }

// import { Injectable } from '@nestjs/common';
// import { BaseRepository } from '../../shared/factory/base.repository';
// import { IOrder } from './interfaces/order.interface';
// import { PrismaService } from 'src/db/prisma/prisma.service';
// import { Prisma, OrderStatus } from '@prisma/client';

// @Injectable()
// export class OrderRepository extends BaseRepository<IOrder> {
//   constructor(protected readonly prisma: PrismaService) {
//     super(prisma, 'order', ['orderNumber'], {
//       pickup: true,
//       customer: true,
//       items: true,
//     });
//   }

//   private async resolveProductsBySku(
//     items: Array<any>,
//   ): Promise<Record<string, string>> {
//     const productIdBySku: Record<string, string> = {};
//     const itemsWithSku = items.filter((i) => i.sku && !i.productId);

//     if (!itemsWithSku.length) return productIdBySku;

//     await Promise.all(
//       itemsWithSku.map(async (i) => {
//         const product = await this.prisma.product.upsert({
//           where: { sku: i.sku! },
//           update: {
//             name: i.name,
//             description: i.description,
//             weight: i.weight as any,
//           },
//           create: {
//             sku: i.sku!,
//             name: i.name,
//             description: i.description,
//             weight: i.weight as any,
//           },
//         });
//         productIdBySku[i.sku!] = product.id;
//       }),
//     );

//     return productIdBySku;
//   }

//   private async prepareItems(
//     itemsInput: Array<any>,
//   ): Promise<Prisma.OrderItemCreateWithoutOrderInput[]> {
//     if (!itemsInput?.length) return [];

//     const productIdBySku = await this.resolveProductsBySku(itemsInput);

//     return itemsInput
//       .filter((i) => i.productId || (i.sku && productIdBySku[i.sku!]))
//       .map((i) => ({
//         product: {
//           connect: {
//             id: i.productId ?? productIdBySku[i.sku!],
//           },
//         },
//         quantity: i.quantity,
//         unitPrice: i.unitPrice,
//         total: i.quantity * i.unitPrice,
//       }));
//   }

//   private computeTotals(
//     items: Prisma.OrderItemCreateWithoutOrderInput[],
//     rawItems: Array<any>,
//     dtoTotals?: { totalValue?: number; totalWeight?: number },
//   ) {
//     const totalValue =
//       dtoTotals?.totalValue ??
//       items.reduce((acc, it) => acc + Number(it.total), 0);

//     const totalWeight =
//       dtoTotals?.totalWeight ??
//       rawItems.reduce(
//         (acc, it) => acc + Number(it.weight || 0) * it.quantity,
//         0,
//       );

//     return { totalValue, totalWeight };
//   }

//   async createWithItems(dto: any): Promise<IOrder> {
//     const prismaItems = await this.prepareItems(dto.items || []);
//     const { totalValue, totalWeight } = this.computeTotals(
//       prismaItems,
//       dto.items || [],
//       dto,
//     );

//     const payload: Prisma.OrderCreateInput = {
//       orderNumber: dto.orderNumber,
//       customer: dto.customerId
//         ? {
//             connect: { id: dto.customerId },
//           }
//         : undefined,
//       status: dto.status ?? OrderStatus.PENDING,
//       failedReason: dto.failedReason,
//       priority: dto.priority,
//       specialInstructions: dto.specialInstructions,
//       estimatedDelivery: dto.estimatedDelivery
//         ? new Date(dto.estimatedDelivery)
//         : undefined,
//       totalValue,
//       totalWeight,
//       items: prismaItems.length ? { create: prismaItems } : undefined,
//     };

//     return this.create(payload, { items: true, customer: true });
//   }

//   async updateWithItems(id: string, dto: any): Promise<IOrder> {
//     const prismaItems = await this.prepareItems(dto.items || []);
//     const { totalValue, totalWeight } = this.computeTotals(
//       prismaItems,
//       dto.items || [],
//       dto,
//     );

//     const { items: _omit, ...rest } = dto;
//     const payload: Prisma.OrderUpdateInput = {
//       ...rest,
//       totalValue,
//       totalWeight,
//       items: {
//         deleteMany: {}, // clear old items
//         ...(prismaItems.length ? { create: prismaItems } : {}),
//       },
//     };

//     return this.update(id, payload, { items: true, customer: true });
//   }
// }

// import {
//   Controller,
//   Get,
//   Post,
//   Put,
//   Delete,
//   Body,
//   Param,
//   Query,
//   HttpStatus,
//   UseGuards,
//   Req,
// } from '@nestjs/common';
// import { OrderService } from './order.service';
// import { APIResponse } from '../../common/utils/api-response.util';
// import { Permissions } from '../../common/decorators/permission.decorator';
// import { EntityType, ActionType, OrderStatus } from '@prisma/client';
// import { SessionGuard } from '../../modules/auth/guards/session.guard';
// import { PermissionGuard } from '../../common/guards/permission.guard';
// import { CreateOrderDto } from './dto/create-order.dto';
// import { UpdateOrderDto } from './dto/update-order.dto';
// import { Audit } from '../../common/decorators/audit.decorator';
// import { CurrentUser } from 'src/common/decorators/current-user.decorator';
// import { AuthUser } from '../auth/interfaces/auth-user.interface';
// import { PaginationResult } from '../../common/utils/api-features.util';
// import { CsrfExempt } from '../../common/decorators/csrf-exempt.decorator';
// import {
//   ScanUpdateStatusDto,
//   BulkScanUpdateDto,
//   ScanHistoryQueryDto,
// } from './dto/scan-update-status.dto';
// import { ScanCreateOrderDto } from './dto/scan-create-order.dto';
// import { IOrder } from './interfaces/order.interface';

// @Controller('orders')
// @UseGuards(SessionGuard, PermissionGuard)
// export class OrderController {
//   constructor(private readonly orderService: OrderService) {}

//   @Post()
//   @Audit({
//     entityType: EntityType.ORDER,
//     actionType: ActionType.CREATE,
//     description: 'Created a new order',
//   })
//   async create(@CurrentUser() user: AuthUser, @Body() dto: CreateOrderDto) {
//     const order = await this.orderService.create(user, dto);
//     return APIResponse.success(
//       { order },
//       'Order created successfully',
//       HttpStatus.CREATED,
//     );
//   }

//   @Get()
//   @Permissions(EntityType.ORDER, ActionType.READ)
//   async findAll(
//     @Query() query: Record<string, any>,
//   ): Promise<APIResponse<{ orders: IOrder[] } & Partial<PaginationResult>>> {
//     const { items, ...pagination } = await this.orderService.findAll(query);
//     return APIResponse.success(
//       { orders: items, ...pagination },
//       'Orders retrieved successfully',
//     );
//   }

//   @Get(':id')
//   @Permissions(EntityType.ORDER, ActionType.READ)
//   async findOne(@Param('id') id: string) {
//     const order = await this.orderService.findOne(id);
//     return APIResponse.success({ order }, 'Order retrieved successfully');
//   }

//   @Put(':id')
//   @Audit({
//     entityType: EntityType.ORDER,
//     actionType: ActionType.UPDATE,
//     entityIdParam: 'id',
//     description: 'Updated order status',
//   })
//   async update(@Param('id') id: string, @Body() dto: UpdateOrderDto) {
//     const order = await this.orderService.update(id, dto);
//     return APIResponse.success({ order }, 'Order updated successfully');
//   }

//   @Delete(':id')
//   @Permissions(EntityType.ORDER, ActionType.DELETE)
//   async delete(@Param('id') id: string) {
//     await this.orderService.delete(id);
//     return APIResponse.success(
//       null,
//       'Order deleted successfully',
//       HttpStatus.NO_CONTENT,
//     );
//   }

//   @Get('scan/sku/:sku')
//   @Permissions(EntityType.ORDER, ActionType.READ)
//   async findBySku(@Param('sku') sku: string) {
//     const order = await this.orderService.findOneBySku(sku);
//     return APIResponse.success({ order }, 'Order retrieved by SKU');
//   }

//   // Scanning endpoints
//   @Post('scan/update-status')
//   @CsrfExempt()
//   async scanUpdateStatus(@Body() dto: ScanUpdateStatusDto, @Req() req?: any) {
//     const signature = req?.headers['x-webhook-signature'] as string | undefined;

//     try {
//       const order = await this.orderService.scanUpdateStatus(
//         dto,
//         signature,
//         req?.rawBody,
//       );
//       return APIResponse.success(
//         {
//           order: {
//             id: order.id,
//             orderNumber: order.orderNumber,
//             status: order.status,
//             updatedAt: order.updatedAt,
//           },
//         },
//         'Order status updated via scan',
//       );
//     } catch (error) {
//       return APIResponse.error(
//         error.message || 'Scan update failed',
//         HttpStatus.BAD_REQUEST,
//         {
//           code: dto.code,
//           codeType: dto.codeType,
//           attemptedStatus: dto.status,
//         },
//       );
//     }
//   }

//   @Post('scan/bulk-update')
//   @CsrfExempt()
//   async bulkScanUpdate(@Body() dto: BulkScanUpdateDto, @Req() req?: any) {
//     const signature = req?.headers['x-webhook-signature'] as string | undefined;

//     try {
//       const results = await this.orderService.bulkScanUpdate(
//         dto,
//         signature,
//         req?.rawBody,
//       );

//       const hasFailures = results.failed.length > 0;
//       const statusCode =
//         hasFailures && results.success.length === 0
//           ? HttpStatus.BAD_REQUEST
//           : hasFailures
//             ? HttpStatus.PARTIAL_CONTENT
//             : HttpStatus.OK;

//       return APIResponse.success(
//         results,
//         `Bulk scan completed. ${results.success.length} succeeded, ${results.failed.length} failed`,
//         statusCode,
//       );
//     } catch (error) {
//       return APIResponse.error(
//         error.message || 'Bulk scan failed',
//         HttpStatus.BAD_REQUEST,
//         { itemCount: dto.items?.length || 0 },
//       );
//     }
//   }

//   @Post('scan/create')
//   @CsrfExempt()
//   async scanCreateOrder(@Body() dto: ScanCreateOrderDto, @Req() req?: any) {
//     const signature = req?.headers['x-webhook-signature'] as string | undefined;

//     try {
//       const order = await this.orderService.scanCreateOrder(
//         dto,
//         signature,
//         req?.rawBody,
//       );
//       return APIResponse.success(
//         { order },
//         'Order created via scan',
//         HttpStatus.CREATED,
//       );
//     } catch (error) {
//       return APIResponse.error(
//         error.message || 'Scan order creation failed',
//         HttpStatus.BAD_REQUEST,
//         {
//           orderNumber: dto.orderNumber,
//           customerId: dto.customerId,
//         },
//       );
//     }
//   }

//   // Scan history and analytics endpoints
//   @Get('scan/history')
//   @Permissions(EntityType.ORDER, ActionType.READ)
//   async getScanHistory(@Query() query: ScanHistoryQueryDto) {
//     const history = await this.orderService.getScanHistory(query);
//     return APIResponse.success(
//       {
//         scans: history,
//         total: history.length,
//         query: query,
//       },
//       'Scan history retrieved successfully',
//     );
//   }

//   @Get(':id/scan-summary')
//   @Permissions(EntityType.ORDER, ActionType.READ)
//   async getOrderScanSummary(@Param('id') id: string) {
//     const summary = await this.orderService.getOrderScanSummary(id);
//     return APIResponse.success(
//       summary,
//       'Order scan summary retrieved successfully',
//     );
//   }

//   // Scanner health check endpoint
//   @Get('scan/health')
//   @CsrfExempt()
//   async scannerHealthCheck() {
//     return APIResponse.success(
//       {
//         status: 'healthy',
//         timestamp: new Date().toISOString(),
//         services: {
//           webhook: 'active',
//           database: 'connected',
//           tracking: 'enabled',
//         },
//       },
//       'Scanner service is healthy',
//     );
//   }

//   // Scanner configuration endpoint
//   @Get('scan/config')
//   @Permissions(EntityType.ORDER, ActionType.READ)
//   async getScannerConfig() {
//     return APIResponse.success(
//       {
//         maxBulkOperations: 100,
//         scanTimeoutMs: 5000,
//         supportedCodeTypes: ['ORDER_ID', 'ORDER_NUMBER', 'SKU'],
//         supportedStatuses: Object.values(OrderStatus),
//         webhookSignatureRequired: true,
//         features: {
//           bulkScanning: true,
//           statusValidation: true,
//           duplicateDetection: true,
//           geoLocation: true,
//         },
//       },
//       'Scanner configuration retrieved',
//     );
//   }
// }
