import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  IsUUID,
  IsBoolean,
} from 'class-validator';

export class CreateTenantUserDto {
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

  @IsString()
  roleId: string;

  @IsUUID()
  tenantId: string;

  @IsOptional()
  @IsBoolean()
  isOwner?: boolean = false;

  @IsOptional()
  @IsUUID()
  warehouseId?: string | null;
}
