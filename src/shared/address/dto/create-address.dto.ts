import { IsNotEmpty, IsOptional, IsString, IsBoolean } from 'class-validator';

export class CreateAddressDto {
  @IsOptional() @IsString() label?: string;
  @IsNotEmpty() @IsString() address1: string;
  @IsOptional() @IsString() address2?: string;
  @IsOptional() @IsString() district?: string;
  @IsNotEmpty() @IsString() city: string;
  @IsOptional() @IsString() state?: string;
  @IsNotEmpty() @IsString() country: string;
  @IsOptional() @IsString() postalCode?: string;
  @IsOptional() latitude?: number;
  @IsOptional() longitude?: number;
  @IsOptional() tenantId?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
