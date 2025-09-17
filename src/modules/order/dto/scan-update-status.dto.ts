import {
  IsEnum,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { OrderStatus } from '@prisma/client';

export class ScanUpdateStatusDto {
  @IsString()
  code!: string; // Could be orderId or orderNumber

  @IsOptional()
  @IsIn(['ORDER_ID', 'ORDER_NUMBER', 'SKU'])
  codeType?: 'ORDER_ID' | 'ORDER_NUMBER' | 'SKU' = 'ORDER_NUMBER';

  @IsEnum(OrderStatus)
  status!: OrderStatus;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  updaterId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
