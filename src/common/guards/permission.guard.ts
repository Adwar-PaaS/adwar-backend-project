import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permission.decorator';
import { EntityType, ActionType, RoleName } from '@prisma/client';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.get<{
      entity: EntityType;
      action: ActionType;
    }>(PERMISSIONS_KEY, context.getHandler());

    if (!required) return true;

    const { user } = context.switchToHttp().getRequest();

    if (!user) throw new ForbiddenException('Not authenticated');

    if (user.userTenants?.some((ut) => ut.isOwner)) return true;

    if (user.role?.name === RoleName.SUPERADMIN) return true;

    const hasPermission = user.role?.permissions?.some(
      (p) => p.entity === required.entity && p.action === required.action,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `You do not have permission to ${required.action} on ${required.entity}`,
      );
    }

    return true;
  }
}
