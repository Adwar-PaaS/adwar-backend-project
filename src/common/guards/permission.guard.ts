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
    const required =
      this.reflector.get<{ entity: EntityType; action: ActionType }>(
        PERMISSIONS_KEY,
        context.getHandler(),
      ) || {};

    const { entity, action } = required;

    if (!entity || !action) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: AuthUser | undefined = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // if (user.role?.name === RoleName.SUPER_ADMIN) {
    //   return true;
    // }

    if (user.role?.name === RoleName.CUSTOMER) {
      throw new ForbiddenException('Customers cannot access this resource');
    }

    const permissions = user.role?.permissions ?? [];

    if (permissions.length === 0) {
      return true;
    }

    const entityPerm = permissions.find((p) => p.entity === entity);

    if (!entityPerm) {
      throw new ForbiddenException(`No permissions for entity ${entity}`);
    }

    const hasPermission =
      entityPerm.actions.includes(ActionType.ALL) ||
      entityPerm.actions.includes(action);

    if (!hasPermission) {
      throw new ForbiddenException(
        `You don't have permission to ${action.toLowerCase()} ${entity.toLowerCase()}`,
      );
    }

    return true;
  }
}
