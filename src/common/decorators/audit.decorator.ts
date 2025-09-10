import { SetMetadata, applyDecorators, UseInterceptors } from '@nestjs/common';
import { AuditInterceptor } from '../interceptors/audit.interceptor';
import { EntityType, ActionType } from '@prisma/client';

export const AUDIT_METADATA_KEY = 'audit:options';

export function Audit(options: {
  entityType: EntityType;
  actionType: ActionType;
  entityIdParam?: string;
  description?: string;
  snapshotFields?: string[];
}) {
  return applyDecorators(
    SetMetadata(AUDIT_METADATA_KEY, options),
    UseInterceptors(AuditInterceptor),
  );
}
