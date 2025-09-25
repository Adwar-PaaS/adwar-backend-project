import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../db/prisma/prisma.service';
import { AuthUser } from '../../modules/auth/interfaces/auth-user.interface';
import { AUDIT_METADATA_KEY } from '../decorators/audit.decorator';
import { AuditOptions } from '../interfaces/audit-options.interface';
import { ActionType } from '@prisma/client';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const options: AuditOptions | undefined = this.reflector.get<AuditOptions>(
      AUDIT_METADATA_KEY,
      context.getHandler(),
    );
    if (!options) return next.handle();

    const req = context.switchToHttp().getRequest();
    const user: AuthUser | undefined = req.user;

    let entityId = this.resolveEntityIdFromParams(req, options.entityIdParam);
    const delegate = this.getDelegate(options.entityType);

    const oldValues =
      delegate && entityId && this.shouldSnapshot('before', options.actionType)
        ? await this.takeSnapshot(delegate, entityId, options.snapshotFields)
        : null;

    return next.handle().pipe(
      tap(async (response) => {
        try {
          if (!entityId) {
            entityId = this.extractEntityId(response);
          }

          const newValues =
            delegate &&
            entityId &&
            this.shouldSnapshot('after', options.actionType)
              ? await this.takeSnapshot(
                  delegate,
                  entityId,
                  options.snapshotFields,
                )
              : null;

          await this.prisma.auditLog.create({
            data: {
              userId: user?.id ?? null,
              entityType: options.entityType,
              entityId,
              actionType: options.actionType,
              oldValues,
              newValues,
              description: options.description ?? null,
              ipAddress: req.ip ?? null,
              userAgent: req.headers['user-agent'] ?? null,
            },
          });
        } catch (err) {
          console.error('Audit log failed:', {
            error: err.message,
            entityType: options.entityType,
            entityId,
            actionType: options.actionType,
          });
        }
      }),
    );
  }

  private getDelegate(entityType: string): any | null {
    const key = entityType?.toLowerCase?.();
    return key && (this.prisma as any)[key] ? (this.prisma as any)[key] : null;
  }

  private buildSelect(fields?: string[]) {
    return fields?.length
      ? Object.fromEntries(fields.map((f) => [f, true]))
      : undefined;
  }

  private async takeSnapshot(
    delegate: any,
    entityId: string,
    fields?: string[],
  ) {
    try {
      return await delegate.findUnique({
        where: { id: entityId },
        select: this.buildSelect(fields),
      });
    } catch (err) {
      console.warn(`Snapshot failed for ${entityId}`, err.message);
      return null;
    }
  }

  private resolveEntityIdFromParams(
    req: any,
    entityIdParam?: string,
  ): string | null {
    return entityIdParam && req.params?.[entityIdParam]
      ? String(req.params[entityIdParam])
      : null;
  }

  private extractEntityId(response: any): string | null {
    if (!response) return null;
    const data = response.data ?? response;
    if (typeof data !== 'object') return null;

    if (data.id) return String(data.id);
    for (const key of Object.keys(data)) {
      if (data[key]?.id) return String(data[key].id);
    }
    return null;
  }

  private readonly snapshotStrategy: Record<
    ActionType,
    { before: boolean; after: boolean }
  > = {
    [ActionType.ALL]: { before: false, after: false },
    [ActionType.CREATE]: { before: false, after: true },
    [ActionType.READ]: { before: false, after: false },
    [ActionType.UPDATE]: { before: true, after: true },
    [ActionType.DELETE]: { before: true, after: false },
    [ActionType.ACTIVATE]: { before: false, after: true },
    [ActionType.DEACTIVATE]: { before: false, after: true },
    [ActionType.APPROVE]: { before: false, after: true },
    [ActionType.EXPORT]: { before: false, after: false },
    [ActionType.IMPORT]: { before: false, after: true },
    [ActionType.REJECT]: { before: false, after: true },
    [ActionType.ASSIGN]: { before: false, after: true },
    [ActionType.COMPLETE]: { before: false, after: true },
    [ActionType.CANCEL]: { before: false, after: true },
  };

  private shouldSnapshot(
    phase: 'before' | 'after',
    action: ActionType,
  ): boolean {
    return this.snapshotStrategy[action]?.[phase] ?? false;
  }
}

// import {
//   Injectable,
//   NestInterceptor,
//   ExecutionContext,
//   CallHandler,
// } from '@nestjs/common';
// import { Reflector } from '@nestjs/core';
// import { Observable } from 'rxjs';
// import { tap } from 'rxjs/operators';
// import { PrismaService } from '../../db/prisma/prisma.service';
// import { AuthUser } from '../../modules/auth/interfaces/auth-user.interface';
// import { AUDIT_METADATA_KEY } from '../decorators/audit.decorator';
// import { AuditOptions } from '../interfaces/audit-options.interface';

// @Injectable()
// export class AuditInterceptor implements NestInterceptor {
//   constructor(
//     private readonly prisma: PrismaService,
//     private readonly reflector: Reflector,
//   ) {}

//   async intercept(
//     context: ExecutionContext,
//     next: CallHandler,
//   ): Promise<Observable<any>> {
//     const options: AuditOptions | undefined = this.reflector.get<AuditOptions>(
//       AUDIT_METADATA_KEY,
//       context.getHandler(),
//     );

//     if (!options) return next.handle();

//     const req = context.switchToHttp().getRequest();
//     const user: AuthUser | undefined = req.user;

//     let entityId: string | null = null;
//     let oldValues: any = null;

//     if (options.entityIdParam && req.params?.[options.entityIdParam]) {
//       entityId = req.params[options.entityIdParam];
//     }

//     const delegate = this.getDelegate(options.entityType);

//     if (delegate && entityId && options.actionType !== 'CREATE') {
//       oldValues = await delegate.findUnique({
//         where: { id: entityId },
//         select: this.buildSelect(options.snapshotFields),
//       });
//     }

//     return next.handle().pipe(
//       tap(async (response) => {
//         try {
//           if (!entityId && response) {
//             entityId = this.extractEntityId(response);
//           }

//           let newValues: any = null;

//           if (delegate && entityId && options.actionType !== 'DELETE') {
//             newValues = await delegate.findUnique({
//               where: { id: entityId },
//               select: this.buildSelect(options.snapshotFields),
//             });
//           }

//           await this.prisma.auditLog.create({
//             data: {
//               userId: user?.id ?? null,
//               entityType: options.entityType,
//               entityId,
//               actionType: options.actionType,
//               oldValues,
//               newValues,
//               description: options.description ?? null,
//               ipAddress: req.ip ?? null,
//               userAgent: req.headers['user-agent'] ?? null,
//             },
//           });
//         } catch (err) {
//           console.error('Audit log failed:', err);
//         }
//       }),
//     );
//   }

//   private getDelegate(entityType: string): any {
//     const key = entityType.toLowerCase();
//     return (this.prisma as any)[key] ?? null;
//   }

//   private buildSelect(fields?: string[]) {
//     if (!fields?.length) return undefined;
//     return fields.reduce((acc, f) => ({ ...acc, [f]: true }), {});
//   }

//   private extractEntityId(response: any): string | null {
//     if (!response) return null;
//     const data = response.data ?? response;
//     if (typeof data !== 'object') return null;

//     if (data.id) return String(data.id);
//     for (const key of Object.keys(data)) {
//       if (data[key]?.id) return String(data[key].id);
//     }

//     return null;
//   }
// }
