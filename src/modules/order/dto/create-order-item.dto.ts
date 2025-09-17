import {
  IsString,
  IsOptional,
  IsNumber,
  IsPositive,
  Min,
} from 'class-validator';

export class CreateOrderItemDto {
  @IsString()
  sku: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @IsPositive()
  weight?: number;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  unitPrice: number;
}
