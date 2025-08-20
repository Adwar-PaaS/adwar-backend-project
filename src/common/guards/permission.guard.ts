import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EntityType, ActionType, RoleName } from '@prisma/client';
import { PermissionService } from '../../shared/permission/permission.service';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionService: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredEntity = this.reflector.get<EntityType>(
      'entity',
      context.getHandler(),
    );
    const requiredAction = this.reflector.get<ActionType>(
      'action',
      context.getHandler(),
    );

    if (!requiredEntity || !requiredAction) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    if (user.userTenants?.some((ut: any) => ut.isOwner)) {
      return true;
    }

    if (user.role?.name === RoleName.SUPER_ADMIN) {
      return true;
    }

    const hasPermission = await this.permissionService.hasPermission(
      user.id,
      requiredEntity,
      requiredAction,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `You don't have permission to ${requiredAction.toLowerCase()} ${requiredEntity.toLowerCase()}`,
      );
    }

    return true;
  }
}
