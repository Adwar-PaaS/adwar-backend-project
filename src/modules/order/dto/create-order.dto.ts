import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
  IsEnum,
} from 'class-validator';
import { FailedReason, OrderStatus } from '@prisma/client';

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  sku: string;

  @IsInt()
  @Min(1)
  quantity: number;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsEnum(FailedReason)
  failedReason?: FailedReason;

  @IsOptional()
  @IsUUID()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  deliveryLocation?: string;

  @IsOptional()
  @IsString()
  merchantLocation?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;
}
