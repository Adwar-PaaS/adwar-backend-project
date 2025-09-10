import { IsUUID } from 'class-validator';

export class RemoveOrderDto {
  @IsUUID()
  orderId: string;
}
