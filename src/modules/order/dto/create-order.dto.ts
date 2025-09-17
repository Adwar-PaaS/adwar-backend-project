import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsPositive,
  ValidateNested,
  Min,
  IsDateString,
  ArrayMinSize,
} from 'class-validator';
import { FailedReason, PriorityStatus, OrderStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { CreateOrderItemDto } from './create-order-item.dto';

export class CreateOrderDto {
  @IsString()
  orderNumber: string;

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
  @IsDateString()
  estimatedDelivery?: string;

  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  @ArrayMinSize(1)
  items: CreateOrderItemDto[];
}
