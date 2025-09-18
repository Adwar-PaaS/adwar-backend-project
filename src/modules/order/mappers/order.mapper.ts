import { OrderViewDto } from '../dto/order-view.dto';
import { plainToInstance } from 'class-transformer';
import { IOrder } from '../interfaces/order.interface';
import { toStringOrNull } from '../../../common/utils/prisma-decimal.util';

function normalizeOrder(order: any) {
  if (!order) return order;

  return {
    ...order,
    totalValue: toStringOrNull(order.totalValue),
    totalWeight: toStringOrNull(order.totalWeight),
    items: order.items?.map((item: any) => ({
      ...item,
      unitPrice: toStringOrNull(item.unitPrice),
      total: toStringOrNull(item.total),
      product: item.product
        ? {
            ...item.product,
            weight: toStringOrNull(item.product.weight),
            isFragile: Boolean(item.product.isFragile),
          }
        : null,
    })),
  };
}

export type OrderView = OrderViewDto;

export function mapOrderView(order: IOrder): OrderView {
  const normalized = normalizeOrder(order);
  return plainToInstance(OrderViewDto, normalized, {
    excludeExtraneousValues: true,
  });
}

export function mapOrderViews(orders: IOrder[]): OrderView[] {
  return orders.map(mapOrderView);
}
