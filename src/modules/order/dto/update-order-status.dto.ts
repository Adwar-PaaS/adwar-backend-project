import { IsEnum, IsOptional, IsString } from 'class-validator';
import { OrderStatus, FailedReason } from '@prisma/client';

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @IsOptional()
  @IsEnum(FailedReason)
  failedReason?: FailedReason;

  @IsOptional()
  @IsString()
  notes?: string;
}
