import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ActionType, EntityType, RoleName } from '@prisma/client';

export class RolePermissionDto {
  @IsEnum(EntityType)
  entityType: EntityType;

  @IsEnum(ActionType)
  actionType: ActionType;
}

export class CreateRoleDto {
  @IsEnum(RoleName)
  name: RoleName;

  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ValidateNested({ each: true })
  @Type(() => RolePermissionDto)
  @ArrayMinSize(1)
  permissions: RolePermissionDto[];
}
