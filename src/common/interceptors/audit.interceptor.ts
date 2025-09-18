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

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const options: AuditOptions | undefined = this.reflector.get<AuditOptions>(
      AUDIT_METADATA_KEY,
      context.getHandler(),
    );

    if (!options) return next.handle();

    const req = context.switchToHttp().getRequest();
    const user: AuthUser | undefined = req.user;

    return next.handle().pipe(
      tap(async (response) => {
        try {
          let entityId =
            (options.entityIdParam && req.params?.[options.entityIdParam]) ||
            null;

          if (!entityId && response) {
            entityId = this.extractEntityId(response);
          }

          const delegate = this.getDelegate(options.entityType);

          let oldValues: any = null;
          let newValues: any = null;

          if (delegate && entityId) {
            oldValues = await delegate.findUnique({
              where: { id: entityId },
              select: this.buildSelect(options.snapshotFields),
            });

            newValues = await delegate.findUnique({
              where: { id: entityId },
              select: this.buildSelect(options.snapshotFields),
            });
          }

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
          console.error('Audit log failed:', err);
        }
      }),
    );
  }

  private getDelegate(entityType: string): any {
    const key = entityType.toLowerCase();
    return (this.prisma as any)[key] ?? null;
  }

  private buildSelect(fields?: string[]) {
    if (!fields?.length) return undefined;
    return fields.reduce((acc, f) => ({ ...acc, [f]: true }), {});
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
}
