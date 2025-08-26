import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  IsUUID,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { EntityType, ActionType } from '@prisma/client';
import { Type } from 'class-transformer';

class PermissionDto {
  @IsEnum(EntityType)
  entityType: EntityType;

  @IsArray()
  @IsEnum(ActionType, { each: true })
  actionType: ActionType[];
}

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

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PermissionDto)
  permissions?: PermissionDto[];
}
