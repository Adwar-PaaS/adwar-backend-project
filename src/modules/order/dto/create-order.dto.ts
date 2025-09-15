import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNumber,
  IsPositive,
  ValidateNested,
  Min,
} from 'class-validator';
import { FailedReason, PriorityStatus, OrderStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { CreateOrderItemDto } from './order-item.dto';

export class CreateOrderDto {
  @IsOptional()
  @IsString()
  orderNumber?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  totalWeight?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalValue?: number;

  @IsOptional()
  @IsString()
  specialInstructions?: string;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus = OrderStatus.PENDING;

  @IsOptional()
  @IsEnum(FailedReason)
  failedReason?: FailedReason;

  @IsOptional()
  @IsEnum(PriorityStatus)
  priority?: PriorityStatus = PriorityStatus.NORMAL;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  estimatedDelivery?: Date;

  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items?: CreateOrderItemDto[];
}
