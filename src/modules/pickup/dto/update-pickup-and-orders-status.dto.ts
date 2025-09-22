import { OrderStatus, PickUpStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdatePickupAndOrdersStatusDto {
  @IsEnum(PickUpStatus)
  pickupStatus!: PickUpStatus;

  @IsEnum(OrderStatus)
  orderStatus!: OrderStatus;
}
