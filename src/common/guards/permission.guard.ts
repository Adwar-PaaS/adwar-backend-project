import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EntityType, ActionType, RoleName } from '@prisma/client';
import { PERMISSIONS_KEY } from '../decorators/permission.decorator';
import { AuthUser } from '../../modules/auth/interfaces/auth-user.interface';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const { entity, action } =
      this.reflector.get<{ entity: EntityType; action: ActionType }>(
        PERMISSIONS_KEY,
        context.getHandler(),
      ) || {};

    if (!entity || !action) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthUser | undefined = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (user.role?.name === RoleName.SUPER_ADMIN) {
      return true;
    }

    const permissions = user.role?.permissions ?? [];

    if (permissions.length === 0) {
      return true;
    }

    const hasAllForEntity = permissions.some(
      (p) => p.entity === entity && p.action === ActionType.ALL,
    );
    if (hasAllForEntity) {
      return true;
    }

    const hasPermission = permissions.some(
      (p) => p.entity === entity && p.action === action,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `You don't have permission to ${action.toLowerCase()} ${entity.toLowerCase()}`,
      );
    }

    return true;
  }
}
