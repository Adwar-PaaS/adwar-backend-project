import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
  IsEnum,
  IsNumber,
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
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsUUID()
  driverId?: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

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

  @IsOptional()
  @IsString()
  paymentType?: string;

  @IsOptional()
  @IsNumber()
  totalPrice?: number;

  @IsOptional()
  @IsString()
  COD_Collection_Method?: string;

  @IsOptional()
  @IsNumber()
  COD_Amount?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
