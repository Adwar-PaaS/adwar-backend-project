import { SetMetadata } from '@nestjs/common';
import { EntityType, ActionType } from '@prisma/client';

export const PERMISSIONS_KEY = 'permissions';
export const Permissions = (entity: EntityType, action: ActionType) =>
  SetMetadata(PERMISSIONS_KEY, { entity, action });
