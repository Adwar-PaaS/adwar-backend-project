import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';

export class CreateWarehouseDto {
  @IsString()
  @IsNotEmpty()
  location: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;

  @IsString()
  @IsNotEmpty()
  tenantId: string;
}
