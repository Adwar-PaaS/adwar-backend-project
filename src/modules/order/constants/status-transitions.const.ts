import { OrderStatus } from '@prisma/client';

export const VALID_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.DRAFT]: [OrderStatus.CREATED, OrderStatus.CANCELLED],
  [OrderStatus.CREATED]: [OrderStatus.PENDING, OrderStatus.CANCELLED],
  [OrderStatus.PENDING]: [OrderStatus.APPROVED, OrderStatus.CANCELLED],
  [OrderStatus.APPROVED]: [
    OrderStatus.ASSIGNED_FOR_PICKUP,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.ASSIGNED_FOR_PICKUP]: [
    OrderStatus.PICKED_UP,
    OrderStatus.FAILED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PICKED_UP]: [
    OrderStatus.RECEIVED_IN_WAREHOUSE,
    OrderStatus.FAILED,
  ],
  [OrderStatus.RECEIVED_IN_WAREHOUSE]: [
    OrderStatus.STORED_ON_SHELVES,
    OrderStatus.FAILED,
  ],
  [OrderStatus.STORED_ON_SHELVES]: [
    OrderStatus.READY_FOR_DISPATCH,
    OrderStatus.FAILED,
  ],
  [OrderStatus.READY_FOR_DISPATCH]: [
    OrderStatus.OUT_FOR_DELIVERY,
    OrderStatus.FAILED,
  ],
  [OrderStatus.OUT_FOR_DELIVERY]: [
    OrderStatus.DELIVERED,
    OrderStatus.FAILED,
    OrderStatus.RESCHEDULED,
  ],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.FAILED]: [
    OrderStatus.RESCHEDULED,
    OrderStatus.RETURNED_TO_OPERATION,
  ],
  [OrderStatus.RESCHEDULED]: [
    OrderStatus.ASSIGNED_FOR_PICKUP,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.RETURNED_TO_OPERATION]: [OrderStatus.READY_TO_RETURN_TO_ORIGIN],
  [OrderStatus.READY_TO_RETURN_TO_ORIGIN]: [OrderStatus.RETURNED_TO_ORIGIN],
  [OrderStatus.RETURNED_TO_ORIGIN]: [],
} as const;
