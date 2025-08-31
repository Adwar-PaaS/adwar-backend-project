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
import { EntityType, ActionType } from '@prisma/client';
import { AuthUser } from '../../modules/auth/interfaces/auth-user.interface';
import { AUDIT_METADATA_KEY } from '../decorators/audit.decorator';

interface AuditOptions {
  entityType: EntityType;
  actionType: ActionType;
  entityIdParam?: string;
  description?: string;
}

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

    if (!options) {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest();
    const user: AuthUser | undefined = req.user;

    return next.handle().pipe(
      tap(async (response) => {
        try {
          const entityId =
            options.entityIdParam && req.params[options.entityIdParam]
              ? req.params[options.entityIdParam]
              : (response?.order?.id ?? response?.id ?? null);

          const oldValues = req._oldEntity ?? null;
          const newValues = response?.order ?? response ?? null;

          await this.prisma.auditLog.create({
            data: {
              userId: user?.id ?? null,
              entityType: options.entityType,
              entityId,
              actionType: options.actionType,
              oldValues,
              newValues,
              description: options.description ?? null,
            },
          });
        } catch (err) {
          console.error('Audit log failed:', err);
        }
      }),
    );
  }
}
