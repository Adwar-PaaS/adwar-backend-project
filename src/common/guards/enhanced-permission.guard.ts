import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { EntityType, ActionType } from '@prisma/client';
import { PermissionService } from '../../modules/auth/services/permission.service';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionService: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredEntity = this.reflector.get<EntityType>('entity', context.getHandler());
    const requiredAction = this.reflector.get<ActionType>('action', context.getHandler());

    if (!requiredEntity || !requiredAction) {
      return true; // No permission requirement set
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
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
