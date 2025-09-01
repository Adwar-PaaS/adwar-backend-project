import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { RoleName } from '@prisma/client';

export class CreateUserViaSuperAdminDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsUUID()
  tenantId: string;

  @IsEnum(RoleName)
  roleName: RoleName;

  @IsOptional()
  @IsUUID()
  warehouseId?: string | null;
}
