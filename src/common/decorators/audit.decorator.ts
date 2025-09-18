import { SetMetadata, applyDecorators, UseInterceptors } from '@nestjs/common';
import { AuditInterceptor } from '../interceptors/audit.interceptor';
import { AuditOptions } from '../interfaces/audit-options.interface';

export const AUDIT_METADATA_KEY = 'audit:options';

export function Audit(options: AuditOptions) {
  return applyDecorators(
    SetMetadata(AUDIT_METADATA_KEY, options),
    UseInterceptors(AuditInterceptor),
  );
}

// @Audit({
//   entityType: EntityType.BRANCH,
//   actionType: ActionType.UPDATE,
//   entityIdParam: 'id',
//   snapshotFields: ['id', 'name', 'code'],
//   description: 'Created a new branch',
// })
