import { FailedReason, PriorityStatus, OrderStatus } from '@prisma/client';

export interface IOrderItem {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  quantity: number;
  unitPrice: number;
  total: number;
  weight?: number | null;
  createdAt: Date;
  updatedAt: Date;
  orderId: string;
}

export interface ICustomer {
  id: string;
  fullName: string;
  phone?: string | null;
}

export interface IOrder {
  id: string;
  orderNumber: string;
  referenceNumber?: string | null;
  totalWeight?: number | null;
  totalValue?: number | null;
  packageCount: number;
  deliveredAt?: Date | null;
  assignedAt?: Date | null;
  pickedAt?: Date | null;
  cancelledAt?: Date | null;
  specialInstructions?: string | null;
  status: OrderStatus;
  failedReason?: FailedReason | null;
  priority: PriorityStatus;
  estimatedDelivery?: Date | null;
  scheduledDelivery?: Date | null;
  branchId?: string | null;
  customerId?: string | null;
  routeId?: string | null;
  createdAt: Date;
  updatedAt: Date;

  items?: IOrderItem[];
  customer?: ICustomer | null;
  // tracking?: any[]; // can be typed later if needed
  // payment?: any | null;
}
