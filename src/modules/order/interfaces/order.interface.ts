import { OrderStatus, FailedReason } from '@prisma/client';

export interface IOrder {
  id: string;
  sku: string;
  quantity: number;
  totalPrice?: number | null;

  deliveryLocation?: string | null;
  merchantLocation?: string | null;
  description?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;

  status: OrderStatus;
  failedReason?: FailedReason | null;

  paymentType?: string | null;
  COD_Collection_Method?: string | null;
  COD_Amount?: number | null;
  notes?: string | null;

  warehouseId?: string | null;
  driverId?: string | null;

  assignedAt?: Date | null;
  pickedAt?: Date | null;
  deliveredAt?: Date | null;
  
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}
