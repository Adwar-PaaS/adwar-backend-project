import { IsEnum, IsOptional, IsString, IsEmail } from 'class-validator';
import { Status } from '@prisma/client';

export class CreateTenantDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsEnum(Status)
  status?: Status;

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
