import {
  IsUUID,
  IsNumber,
  IsString,
  IsArray,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class OrderCompletionStatusDto {
  @IsUUID()
  orderId!: string;

  @IsNumber()
  totalItems!: number;

  @IsNumber()
  scannedItems!: number;

  @IsString({ each: true })
  pendingItems!: string[];

  @IsNumber()
  completionPercentage!: number;

  @IsNumber()
  canProgressStatus!: boolean;

  @IsOptional()
  @IsEnum(OrderStatus)
  suggestedNextStatus?: OrderStatus;
}
