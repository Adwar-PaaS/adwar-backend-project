import { IsArray, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { RequestStatus } from '@prisma/client';

export class CreatePickupRequestDto {
  @IsArray()
  @IsNotEmpty()
  orderIds: string[];

  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;
}
