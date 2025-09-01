import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EntityType, ActionType } from '@prisma/client';

export class CreateRequestDto {
  @IsEnum(EntityType)
  entityType: EntityType;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsEnum(ActionType)
  actionType: ActionType;

  @IsOptional()
  @IsString()
  reason?: string;
}
