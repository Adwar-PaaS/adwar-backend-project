import { IsUUID } from 'class-validator';

export class AddOrderDto {
  @IsUUID()
  orderId: string;
}
