import {
  IsString,
  IsOptional,
  IsUUID,
  IsObject,
  IsEnum,
} from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class BulkScanItemDto {
  @IsString()
  sku!: string;

  @IsOptional()
  @IsUUID()
  orderId?: string;

  @IsOptional()
  @IsString()
  orderNumber?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class BulkItemScanDto {
  @IsString({ each: true })
  items!: BulkScanItemDto[];

  @IsEnum(OrderStatus)
  status!: OrderStatus;

  @IsOptional()
  @IsUUID()
  updaterId?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
