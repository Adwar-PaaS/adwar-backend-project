import { IsEnum, IsOptional, IsString, IsEmail } from 'class-validator';
import { TenantStatus } from '@prisma/client';

export class CreateTenantDto {
  @IsString()
  name: string;

  @IsEnum(TenantStatus)
  status: TenantStatus;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  logo?: string;

  @IsOptional()
  @IsString()
  address?: string;
}
