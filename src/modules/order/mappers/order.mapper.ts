import { OrderViewDto } from '../dto/order-view.dto';
import { plainToInstance } from 'class-transformer';
import { toStringOrNull } from '../../../common/utils/prisma-decimal.util';
import { Order } from '@prisma/client';

function normalizeOrder(order: any) {
  if (!order) return order;

  return {
    ...order,
    totalValue: toStringOrNull(order.totalValue),
    totalWeight: toStringOrNull(order.totalWeight),
    items: order.items?.map((item: any) => {
      const { product, ...rest } = item;

      return {
        ...rest,
        sku: product?.sku ?? null,
        unitPrice: toStringOrNull(item.unitPrice),
        total: toStringOrNull(item.total),
        name: product?.name ?? null,
        description: product?.description ?? null,
        category: product?.category ?? null,
        weight: toStringOrNull(product?.weight),
        isFragile: Boolean(product?.isFragile),
        scannedAt: item.scannedAt ? item.scannedAt.toISOString() : null,
      };
    }),
  };
}

export type OrderView = OrderViewDto;

export function mapOrderView(order: Order): OrderView {
  const normalized = normalizeOrder(order);
  return plainToInstance(OrderViewDto, normalized, {
    excludeExtraneousValues: true,
  });
}

export function mapOrderViews(orders: Order[]): OrderView[] {
  return orders.map(mapOrderView);
}
