import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderRepository } from './order.repository';
import { IOrder } from './interfaces/order.interface';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
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
    const updateData: any = { ...dto };

    if (dto.items !== undefined) {
      const itemsWithTotal = (dto.items || []).map((item) => ({
        sku: item.sku,
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        weight: item.weight,
        total: item.quantity * item.unitPrice,
      }));

      updateData.items = {
        deleteMany: {},
        create: itemsWithTotal,
      };

      updateData.totalValue =
        dto.totalValue ??
        itemsWithTotal.reduce((acc, item) => acc + item.total, 0);

      updateData.totalWeight =
        dto.totalWeight ??
        itemsWithTotal.reduce(
          (acc, item) => acc + (item.weight || 0) * item.quantity,
          0,
        );
    }

    return this.orderRepo.update(id, updateData, { items: true });
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

  async delete(id: string): Promise<void> {
    return this.orderRepo.delete(id);
  }

  // async findByItemSku(sku: string) {
  //   return this.orderRepo.findByItemSku(sku);
  // }

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
