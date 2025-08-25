import { EntityType, ActionType, RoleName } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
  ArrayNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

class PermissionDto {
  @IsEnum(EntityType)
  entityType: EntityType;

  @IsEnum(ActionType, { each: true })
  @ArrayNotEmpty()
  actionTypes: ActionType[];
}

export class CreateRoleDto {
  @IsEnum(RoleName)
  name: RoleName;

  @IsOptional()
  @IsString()
  tenantId?: string | null;

  @ValidateNested({ each: true })
  @Type(() => PermissionDto)
  permissions: PermissionDto[];
}
