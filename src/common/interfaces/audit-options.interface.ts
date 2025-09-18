import { EntityType, ActionType } from '@prisma/client';

export interface AuditOptions {
  entityType: EntityType;
  actionType: ActionType;
  entityIdParam?: string;
  snapshotFields?: string[];
  description?: string;
}
