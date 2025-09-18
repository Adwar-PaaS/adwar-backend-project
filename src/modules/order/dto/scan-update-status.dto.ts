import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  ValidateNested,
  IsDateString,
  Min,
  Max,
  IsUUID,
  IsObject,
  ArrayMaxSize,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '@prisma/client';

export enum CodeType {
  ORDER_ID = 'ORDER_ID',
  ORDER_NUMBER = 'ORDER_NUMBER',
  SKU = 'SKU',
}

export class ScanUpdateStatusDto {
  @IsString()
  code!: string;

  @IsOptional()
  @IsEnum(CodeType)
  codeType?: CodeType = CodeType.ORDER_NUMBER;

  @IsEnum(OrderStatus)
  status!: OrderStatus;

  @IsOptional()
  @IsUUID()
  updaterId?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  timestamp?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  operatorId?: string;
}

export class BulkScanItemDto {
  @IsString()
  code!: string;

  @IsEnum(CodeType)
  codeType!: CodeType;

  @IsEnum(OrderStatus)
  status!: OrderStatus;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  timestamp?: string;

  @IsOptional()
  @IsString()
  itemSequence?: string;
}

export class BulkScanUpdateDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkScanItemDto)
  @ArrayMaxSize(100)
  items!: BulkScanItemDto[];

  @IsOptional()
  @IsUUID()
  updaterId?: string;

  @IsOptional()
  @IsString()
  batchId?: string;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  operatorId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  validateTransitions?: boolean;

  @IsOptional()
  @IsBoolean()
  allowPartialSuccess?: boolean;
}

export class ScanHistoryQueryDto {
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @IsOptional()
  @IsUUID()
  updaterId?: string;

  @IsOptional()
  @IsString()
  operatorId?: string;

  @IsOptional()
  @IsString()
  deviceId?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(500)
  limit?: number = 50;
}