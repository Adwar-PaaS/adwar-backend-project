import { IsEnum, IsOptional, IsString, IsEmail } from 'class-validator';
import { TenantStatus } from '@prisma/client';

export class CreateTenantDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  address?: string;
}
