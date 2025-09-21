import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { OrderRepository } from './order.repository';
import { IOrder } from './interfaces/order.interface';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { OrderStatus } from '@prisma/client';
import {
  ScanUpdateStatusDto,
  BulkScanUpdateDto,
  CodeType,
} from './dto/scan-update-status.dto';
import { PrismaService } from 'src/db/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import {
  computeHmacSha256,
  safeTimingEqual,
} from '../../common/utils/hmac.util';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { UpdateItemsInOrderDto } from './dto/update-order-items.dto';
import { BulkItemScanDto } from './dto/bulk-item-scan.dto';
import { OrderCompletionStatusDto } from './dto/order-completion-status.dto';
import { ScanItemDto } from './dto/scan-item.dto';
import { VALID_STATUS_TRANSITIONS } from './constants/status-transitions.const';
import { ScannerDeviceService } from '../scanner-device/scanner.service';

@Injectable()
export class OrderService {
  private readonly maxBulkOperations = 100;
  constructor(
    private readonly orderRepo: OrderRepository,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly scannerDeviceService: ScannerDeviceService,
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

  async updateItemsInOrder(
    orderId: string,
    items: Partial<UpdateItemsInOrderDto['items'][0]>[],
  ): Promise<IOrder> {
    return this.orderRepo.updateItemsInOrder(orderId, items);
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
    return this.orderRepo.findOne({ sku });
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

  private async validateScannerDevice(deviceId: string) {
    if (!deviceId) return;
    try {
      await this.scannerDeviceService.validateDevice(deviceId);
    } catch (error) {
      throw new UnauthorizedException(
        'Invalid scanner device: ' + error.message,
      );
    }
  }

  private async verifyWebhook(
    signature?: string,
    rawBody?: Buffer,
    deviceId?: string,
  ) {
    const secret = this.config.get<string>('WEBHOOK_HMAC_SECRET');
    if (secret && rawBody) {
      const expected = computeHmacSha256(secret, rawBody);
      if (!signature || !safeTimingEqual(expected, signature)) {
        throw new NotFoundException('Invalid webhook signature');
      }
    }
    if (deviceId) {
      await this.validateScannerDevice(deviceId);
    }
  }

  // Helper method for transaction context
  private async getOrderCompletionStatusInTransaction(
    tx: any,
    orderId: string,
    intendedStatus?: OrderStatus,
  ): Promise<OrderCompletionStatusDto> {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) throw new NotFoundException('Order not found');

    const totalItems = order.items?.length || 0;
    const scannedItems =
      order.items?.filter((item: any) => item.scannedAt).length || 0;
    const pendingItems: string[] = [];

    const completionPercentage =
      totalItems > 0 ? Math.round((scannedItems / totalItems) * 100) : 0;
    const canProgressStatus = completionPercentage === 100;

    let suggestedNextStatus: OrderStatus | undefined;
    if (canProgressStatus && intendedStatus) {
      suggestedNextStatus = intendedStatus;
    }

    return {
      orderId,
      totalItems,
      scannedItems,
      pendingItems,
      completionPercentage,
      canProgressStatus,
      suggestedNextStatus,
    };
  }

  // Scan individual item and check if order should be updated
  async scanItem(
    dto: ScanItemDto,
    signature?: string,
    rawBody?: Buffer,
  ): Promise<{
    order: IOrder;
    itemScanned: boolean;
    orderStatusUpdated: boolean;
    completionStatus: OrderCompletionStatusDto;
  }> {
    await this.verifyWebhook(signature, rawBody, dto.deviceId);

    // Find order by ID or order number
    let whereOrder: any = {};
    if (dto.orderId) {
      whereOrder = { id: dto.orderId };
    } else if (dto.orderNumber) {
      whereOrder = { orderNumber: dto.orderNumber };
    } else {
      throw new BadRequestException(
        'Order ID or Order Number is required for item scan',
      );
    }

    const order = await this.prisma.order.findFirst({
      where: whereOrder as any,
      include: { items: { include: { product: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');

    // Find the specific item by SKU
    const orderItem = order.items?.find(
      (item: any) => item.product?.sku === dto.sku,
    );
    if (!orderItem) {
      throw new NotFoundException(
        `Item with SKU ${dto.sku} not found in this order`,
      );
    }

    // Mark order item as scanned
    await this.prisma.orderItem.update({
      where: { id: (orderItem as any).id },
      data: { scannedAt: new Date() } as any,
    });

    // Create tracking event for item scan
    await this.prisma.trackingEvent.create({
      data: {
        orderId: order.id,
        updaterId: dto.updaterId,
        status: dto.status,
        location: dto.location,
        latitude: dto.latitude as any,
        longitude: dto.longitude as any,
        notes: dto.notes || `Item scanned: ${dto.sku}`,
        eventType: 'ITEM_SCAN',
        metadata: {
          ...dto.metadata,
          scannedItem: {
            sku: dto.sku,
            orderItemId: (orderItem as any).id,
            quantity: (orderItem as any).quantity,
          },
        },
      },
    });

    // Check completion status
    const completionStatus = await this.getOrderCompletionStatus(
      order.id,
      dto.status,
    );
    let orderStatusUpdated = false;

    // Auto-update order status if all items are scanned and status allows progression
    if (
      completionStatus.canProgressStatus &&
      completionStatus.scannedItems === completionStatus.totalItems &&
      completionStatus.suggestedNextStatus &&
      VALID_STATUS_TRANSITIONS[order.status]?.includes(
        completionStatus.suggestedNextStatus,
      )
    ) {
      await this.orderRepo.update(order.id, {
        status: completionStatus.suggestedNextStatus,
        ...(completionStatus.suggestedNextStatus === OrderStatus.PICKED_UP && {
          pickedAt: new Date(),
        }),
        ...(completionStatus.suggestedNextStatus === OrderStatus.DELIVERED && {
          deliveredAt: new Date(),
        }),
      });

      // Create tracking event for order status update
      await this.prisma.trackingEvent.create({
        data: {
          orderId: order.id,
          updaterId: dto.updaterId,
          status: completionStatus.suggestedNextStatus,
          location: dto.location,
          latitude: dto.latitude as any,
          longitude: dto.longitude as any,
          notes: 'Order status auto-updated after all items scanned',
          eventType: 'AUTO_STATUS_UPDATE',
          metadata: {
            trigger: 'ALL_ITEMS_SCANNED',
            previousStatus: order.status,
            completionPercentage: 100,
          },
        },
      });

      orderStatusUpdated = true;
    }

    return {
      order: await this.orderRepo.findOne({ id: order.id }),
      itemScanned: true,
      orderStatusUpdated,
      completionStatus,
    };
  }

  // Bulk scan multiple items
  async bulkScanItems(
    dto: BulkItemScanDto,
    signature?: string,
    rawBody?: Buffer,
  ): Promise<{
    success: Array<{ sku: string; orderId: string }>;
    failed: Array<{ sku: string; error: string }>;
    ordersUpdated: Array<{ orderId: string; newStatus: OrderStatus }>;
  }> {
    this.verifyWebhook(signature, rawBody, dto.deviceId);

    if (dto.items.length > this.maxBulkOperations) {
      throw new BadRequestException(
        `Bulk operation limited to ${this.maxBulkOperations} items`,
      );
    }

    const results: {
      success: Array<{ sku: string; orderId: string }>;
      failed: Array<{ sku: string; error: string }>;
      ordersUpdated: Array<{ orderId: string; newStatus: OrderStatus }>;
    } = { success: [], failed: [], ordersUpdated: [] };
    const processedOrders = new Set<string>();

    await this.prisma.$transaction(async (tx) => {
      for (const item of dto.items) {
        try {
          // Find order
          let whereOrder: any = {};
          if (item.orderId) {
            whereOrder = { id: item.orderId };
          } else if (item.orderNumber) {
            whereOrder = { orderNumber: item.orderNumber };
          } else {
            results.failed.push({
              sku: item.sku,
              error: 'Order ID or Order Number required',
            });
            continue;
          }

          const order = await tx.order.findFirst({
            where: whereOrder,
            include: { items: { include: { product: true } } },
          });

          if (!order) {
            results.failed.push({ sku: item.sku, error: 'Order not found' });
            continue;
          }

          // Check if item exists in order
          const orderItem = order.items.find(
            (oi: any) => oi.product?.sku === item.sku,
          );
          if (!orderItem) {
            results.failed.push({
              sku: item.sku,
              error: `Item with SKU ${item.sku} not found in order ${order.orderNumber}`,
            });
            continue;
          }

          // Mark order item as scanned
          await tx.orderItem.update({
            where: { id: orderItem.id },
            data: { scannedAt: new Date() } as any,
          });

          // Create tracking event
          await tx.trackingEvent.create({
            data: {
              orderId: order.id,
              updaterId: dto.updaterId,
              status: dto.status,
              location: item.location || dto.location,
              notes: item.notes || `Bulk scan: ${item.sku}`,
              eventType: 'BULK_ITEM_SCAN',
              metadata: {
                ...dto.metadata,
                bulkOperation: true,
                scannedItem: {
                  sku: item.sku,
                  productId: orderItem.productId,
                },
              },
            },
          });

          results.success.push({ sku: item.sku, orderId: order.id });
          processedOrders.add(order.id);
        } catch (error) {
          results.failed.push({
            sku: item.sku,
            error: error.message || 'Unknown error',
          });
        }
      }

      // Check and update order statuses for all processed orders
      for (const orderId of processedOrders) {
        try {
          const completionStatus =
            await this.getOrderCompletionStatusInTransaction(
              tx,
              orderId,
              dto.status,
            );

          if (
            completionStatus.canProgressStatus &&
            completionStatus.scannedItems === completionStatus.totalItems &&
            completionStatus.suggestedNextStatus
          ) {
            const foundOrder = await tx.order.findUnique({
              where: { id: orderId },
            });
            if (
              foundOrder &&
              VALID_STATUS_TRANSITIONS[foundOrder.status]?.includes(
                completionStatus.suggestedNextStatus,
              )
            ) {
              const order = foundOrder;
              await tx.order.update({
                where: { id: orderId },
                data: {
                  status: completionStatus.suggestedNextStatus,
                  ...(completionStatus.suggestedNextStatus ===
                    OrderStatus.PICKED_UP && { pickedAt: new Date() }),
                  ...(completionStatus.suggestedNextStatus ===
                    OrderStatus.DELIVERED && { deliveredAt: new Date() }),
                },
              });

              await tx.trackingEvent.create({
                data: {
                  orderId,
                  updaterId: dto.updaterId,
                  status: completionStatus.suggestedNextStatus,
                  location: dto.location,
                  notes:
                    'Order auto-updated after bulk item scanning completion',
                  eventType: 'BULK_AUTO_STATUS_UPDATE',
                  metadata: {
                    trigger: 'BULK_ALL_ITEMS_SCANNED',
                    previousStatus: order.status,
                  },
                },
              });

              results.ordersUpdated.push({
                orderId,
                newStatus: completionStatus.suggestedNextStatus,
              });
            }
          }
        } catch (error) {
          console.error(`Failed to update order ${orderId} status:`, error);
        }
      }
    });

    return results;
  }

  // Scan entire order by order number (marks all items as scanned)
  async scanCompleteOrder(
    dto: ScanUpdateStatusDto,
    signature?: string,
    rawBody?: Buffer,
  ): Promise<IOrder> {
    this.verifyWebhook(signature, rawBody, dto.deviceId);

    const where =
      dto.codeType === CodeType.ORDER_ID
        ? { id: dto.code }
        : { orderNumber: dto.code };

    const order = await this.prisma.order.findFirst({
      where: where as any,
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    if (!VALID_STATUS_TRANSITIONS[order.status]?.includes(dto.status)) {
      throw new BadRequestException(
        `Invalid status transition from ${order.status} to ${dto.status}`,
      );
    }

    await this.prisma.$transaction(async (tx) => {
      // Mark all order items scanned
      await tx.orderItem.updateMany({
        where: { orderId: order.id },
        data: { scannedAt: new Date() } as any,
      });

      // Update order status
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: dto.status,
          ...(dto.status === OrderStatus.PICKED_UP && { pickedAt: new Date() }),
          ...(dto.status === OrderStatus.DELIVERED && {
            deliveredAt: new Date(),
          }),
          ...(dto.status === OrderStatus.CANCELLED && {
            cancelledAt: new Date(),
          }),
        },
      });

      // Create tracking event for complete order scan
      await tx.trackingEvent.create({
        data: {
          orderId: order.id,
          updaterId: dto.updaterId,
          status: dto.status,
          location: dto.location,
          latitude: dto.latitude as any,
          longitude: dto.longitude as any,
          notes: dto.notes || 'Complete order scanned',
          eventType: 'COMPLETE_ORDER_SCAN',
          metadata: {
            ...dto.metadata,
            previousStatus: order.status,
            action: 'COMPLETE_ORDER_SCAN',
          },
        },
      });
    });

    return this.orderRepo.findOne({ id: order.id });
  }

  // Get order completion status
  async getOrderCompletionStatus(
    orderId: string,
    intendedStatus?: OrderStatus,
  ): Promise<OrderCompletionStatusDto> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) throw new NotFoundException('Order not found');

    const totalItems = order.items?.length || 0;
    const scannedItems =
      order.items?.filter((item: any) => item.scannedAt).length || 0;
    const pendingItems: string[] = [];

    const completionPercentage =
      totalItems > 0 ? Math.round((scannedItems / totalItems) * 100) : 0;

    // Determine if order can progress and suggest next status
    const canProgressStatus = completionPercentage === 100;
    let suggestedNextStatus: OrderStatus | undefined;

    if (canProgressStatus && intendedStatus) {
      suggestedNextStatus = intendedStatus;
    }

    return {
      orderId,
      totalItems,
      scannedItems,
      pendingItems,
      completionPercentage,
      canProgressStatus,
      suggestedNextStatus,
    };
  }

  // Reset scanned status for order items (for testing/correction purposes)
  async resetOrderScanStatus(
    orderId: string,
    signature?: string,
    rawBody?: Buffer,
  ): Promise<{ resetCount: number; order: IOrder }> {
    this.verifyWebhook(signature, rawBody);

    const order = await this.orderRepo.findOne(
      { id: orderId },
      { items: { include: { product: true } } },
    );

    if (!order) throw new NotFoundException('Order not found');

    const resetResult = await this.prisma.orderItem.updateMany({
      where: { orderId },
      data: { scannedAt: null } as any,
    });

    await this.prisma.trackingEvent.create({
      data: {
        orderId: order.id,
        status: order.status,
        notes: 'Order scan status reset',
        eventType: 'SCAN_STATUS_RESET',
        metadata: {
          itemsReset: resetResult.count,
        },
      },
    });

    return {
      resetCount: resetResult.count,
      order: await this.orderRepo.findOne({ id: orderId }),
    };
  }

  // Update status via scan by code (SKU, ORDER_ID, ORDER_NUMBER)
  async scanUpdateStatus(
    dto: ScanUpdateStatusDto,
    signature?: string,
    rawBody?: Buffer,
  ): Promise<IOrder> {
    this.verifyWebhook(signature, rawBody, dto.deviceId);

    if (dto.codeType === CodeType.SKU) {
      // Find order containing this SKU, then treat as single item scan
      const order = await this.prisma.order.findFirst({
        where: {
          items: {
            some: { product: { is: { sku: dto.code } } },
          },
        },
        include: { items: { include: { product: true } } },
        orderBy: { createdAt: 'desc' },
      });
      if (!order) throw new NotFoundException('Order not found for SKU');

      const item = order.items.find((i) => i.product.sku === dto.code);
      if (!item) throw new NotFoundException('Item not found in order');

      // Mark as scanned and create tracking
      await this.prisma.orderItem.update({
        where: { id: item.id },
        data: { scannedAt: new Date() } as any,
      });

      await this.prisma.trackingEvent.create({
        data: {
          orderId: order.id,
          updaterId: dto.updaterId,
          status: dto.status,
          location: dto.location,
          latitude: dto.latitude as any,
          longitude: dto.longitude as any,
          notes: dto.notes || `Item scanned: ${dto.code}`,
          eventType: 'ITEM_SCAN',
          metadata: {
            ...dto.metadata,
            scannedItem: { sku: dto.code, productId: item.productId },
          },
        },
      });

      // Possibly progress order status
      const completion = await this.getOrderCompletionStatus(
        order.id,
        dto.status,
      );
      if (
        completion.canProgressStatus &&
        completion.scannedItems === completion.totalItems &&
        completion.suggestedNextStatus &&
        VALID_STATUS_TRANSITIONS[order.status]?.includes(
          completion.suggestedNextStatus,
        )
      ) {
        await this.prisma.order.update({
          where: { id: order.id },
          data: {
            status: completion.suggestedNextStatus,
            ...(completion.suggestedNextStatus === OrderStatus.PICKED_UP && {
              pickedAt: new Date(),
            }),
            ...(completion.suggestedNextStatus === OrderStatus.DELIVERED && {
              deliveredAt: new Date(),
            }),
          },
        });

        await this.prisma.trackingEvent.create({
          data: {
            orderId: order.id,
            updaterId: dto.updaterId,
            status: completion.suggestedNextStatus,
            location: dto.location,
            notes: 'Order status auto-updated after all items scanned',
            eventType: 'AUTO_STATUS_UPDATE',
            metadata: {
              trigger: 'ALL_ITEMS_SCANNED',
              previousStatus: order.status,
            },
          },
        });
      }

      return this.orderRepo.findOne({ id: order.id });
    }

    // Complete order scan by id or orderNumber
    return this.scanCompleteOrder(dto, signature, rawBody);
  }

  // Bulk scan update
  async bulkScanUpdate(
    dto: BulkScanUpdateDto,
    signature?: string,
    rawBody?: Buffer,
  ): Promise<{
    success: Array<{ code: string; orderId: string }>;
    failed: Array<{ code: string; error: string }>;
    ordersUpdated: Array<{ orderId: string; newStatus: OrderStatus }>;
  }> {
    this.verifyWebhook(signature, rawBody, dto.deviceId);

    const results: {
      success: Array<{ code: string; orderId: string }>;
      failed: Array<{ code: string; error: string }>;
      ordersUpdated: Array<{ orderId: string; newStatus: OrderStatus }>;
    } = { success: [], failed: [], ordersUpdated: [] };
    const processedOrders = new Set<string>();
    const orderToStatus = new Map<string, OrderStatus>();

    await this.prisma.$transaction(async (tx) => {
      for (const item of dto.items || []) {
        try {
          let order: any;
          if (item.codeType === CodeType.SKU) {
            order = await tx.order.findFirst({
              where: {
                items: { some: { product: { is: { sku: item.code } } } },
              },
              include: { items: { include: { product: true } } },
              orderBy: { createdAt: 'desc' },
            });
            if (!order) throw new NotFoundException('Order not found for SKU');
            const oi = order.items.find(
              (i: any) => i.product?.sku === item.code,
            );
            if (!oi) throw new NotFoundException('Item not found in order');
            await tx.orderItem.update({
              where: { id: oi.id },
              data: { scannedAt: new Date() } as any,
            });
            await tx.trackingEvent.create({
              data: {
                orderId: order.id,
                updaterId: dto.updaterId,
                status: item.status,
                location: item.location,
                notes: item.notes || `Bulk scan: ${item.code}`,
                eventType: 'BULK_ITEM_SCAN',
                metadata: {
                  bulkOperation: true,
                  scannedItem: { sku: item.code, orderItemId: oi.id },
                },
              },
            });
            results.success.push({ code: item.code, orderId: order.id });
            processedOrders.add(order.id);
            // Set status for order (last wins if multiple)
            orderToStatus.set(order.id, item.status);
          } else {
            // Full order update
            const where =
              item.codeType === CodeType.ORDER_ID
                ? { id: item.code }
                : { orderNumber: item.code };
            order = await tx.order.findFirst({
              where,
              include: { items: { include: { product: true } } },
            });
            if (!order) throw new NotFoundException('Order not found');
            // Mark all order items as scanned
            await tx.orderItem.updateMany({
              where: { orderId: order.id },
              data: { scannedAt: new Date() } as any,
            });
            await tx.order.update({
              where: { id: order.id },
              data: {
                status: item.status,
                ...(item.status === OrderStatus.PICKED_UP && {
                  pickedAt: new Date(),
                }),
                ...(item.status === OrderStatus.DELIVERED && {
                  deliveredAt: new Date(),
                }),
                ...(item.status === OrderStatus.CANCELLED && {
                  cancelledAt: new Date(),
                }),
              },
            });
            await tx.trackingEvent.create({
              data: {
                orderId: order.id,
                updaterId: dto.updaterId,
                status: item.status,
                location: item.location,
                notes: item.notes || 'Complete order scanned (bulk)',
                eventType: 'COMPLETE_ORDER_SCAN',
                metadata: { bulkOperation: true, previousStatus: order.status },
              },
            });
            results.success.push({ code: item.code, orderId: order.id });
            processedOrders.add(order.id);
            orderToStatus.set(order.id, item.status);
          }
        } catch (e: any) {
          results.failed.push({
            code: item.code,
            error: e.message || 'Unknown error',
          });
        }
      }

      // Post-process orders for auto progress
      for (const orderId of processedOrders) {
        try {
          const intendedStatus = orderToStatus.get(orderId);
          const completion = await this.getOrderCompletionStatusInTransaction(
            tx,
            orderId,
            intendedStatus,
          );
          if (
            completion.canProgressStatus &&
            completion.scannedItems === completion.totalItems &&
            completion.suggestedNextStatus
          ) {
            const order = await tx.order.findUnique({ where: { id: orderId } });
            if (
              order &&
              VALID_STATUS_TRANSITIONS[order.status]?.includes(
                completion.suggestedNextStatus,
              )
            ) {
              await tx.order.update({
                where: { id: orderId },
                data: {
                  status: completion.suggestedNextStatus,
                  ...(completion.suggestedNextStatus ===
                    OrderStatus.PICKED_UP && {
                    pickedAt: new Date(),
                  }),
                  ...(completion.suggestedNextStatus ===
                    OrderStatus.DELIVERED && {
                    deliveredAt: new Date(),
                  }),
                },
              });
              results.ordersUpdated.push({
                orderId,
                newStatus: completion.suggestedNextStatus,
              });
            }
          }
        } catch (err) {
          // ignore per-order errors here
        }
      }
    });

    return results;
  }
}
