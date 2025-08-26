import { OrderStatus, FailedReason } from '@prisma/client';

export interface IOrder {
  id: string;
  sku: string;
  quantity: number;
  warehouseId: string;
  deliveryLocation?: string | null;
  merchantLocation?: string | null;
  description?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  status: OrderStatus;
  failedReason?: FailedReason | null;
  createdAt: Date;
  updatedAt: Date;
}
