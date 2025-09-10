import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  IsUUID,
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
  @IsUUID()
  branchId?: string | null;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => PermissionDto)
  permissions?: PermissionDto[];
}
