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
          let entityId =
            (options.entityIdParam && req.params?.[options.entityIdParam]) ||
            null;

          if (!entityId && response) {
            entityId = this.extractEntityId(response);
          }

          const oldValues = req._oldEntity ?? null;
          const newValues = this.unwrapResponse(response);

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

  private unwrapResponse(response: any): any {
    if (!response) return null;

    if (response.data) {
      return response.data;
    }
    return response;
  }

  private extractEntityId(response: any): string | null {
    if (!response) return null;

    const data = response.data ?? response;

    if (typeof data === 'object') {
      if (data.id) return data.id;

      for (const key of Object.keys(data)) {
        if (data[key]?.id) {
          return data[key].id;
        }
      }
    }

    return null;
  }
}
