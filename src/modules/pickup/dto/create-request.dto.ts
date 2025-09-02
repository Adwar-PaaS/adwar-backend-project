import { IsUUID } from 'class-validator';

export class CreateRequestDto {
  @IsUUID()
  pickupId: string;
}
