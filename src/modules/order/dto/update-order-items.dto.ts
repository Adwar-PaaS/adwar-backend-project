import {
  IsOptional,
  IsString,
  IsNumber,
  IsUUID,
  IsBoolean,
} from 'class-validator';

export class UpdateItemsInOrderDto {
  items: UpdateItemInOrderDto[];
}

export class UpdateItemInOrderDto {
  @IsUUID()
  id!: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  weight?: number;

  @IsOptional()
  @IsBoolean()
  isFragile?: boolean;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsNumber()
  unitPrice?: number;
}
