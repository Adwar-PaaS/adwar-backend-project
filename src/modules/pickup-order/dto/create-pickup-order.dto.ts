import { IsUUID } from 'class-validator';

export class CreatePickupOrderDto {
  @IsUUID()
  pickUpRequestId: string;

  @IsUUID()
  orderId: string;
}
