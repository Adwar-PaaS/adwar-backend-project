import {
  IsString,
  IsOptional,
  IsInt,
  IsUUID,
  IsPhoneNumber,
  Min,
} from 'class-validator';

export class UpdateOrderDto {
  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

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
  @IsPhoneNumber()
  customerPhone?: string;
}
