import { IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { EntityType, ActionType } from '@prisma/client';

export class PermissionDto {
  @IsEnum(EntityType, { message: 'entityType must be a valid EntityType enum' })
  entityType: EntityType;

  @IsArray()
  @IsEnum(ActionType, {
    each: true,
    message: 'actionType must be valid ActionType enums',
  })
  actionTypes: ActionType[];
}

export class AddPermissionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PermissionDto)
  permissions: PermissionDto[];
}
