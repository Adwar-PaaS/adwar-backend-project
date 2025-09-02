import { IsUUID } from 'class-validator';

export class CreatePickupDto {
  @IsUUID('all', { each: true })
  orderIds: string[];
}
