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

    if (user.isOwner) {
      return true;
    }

    const hasPermission = user.role?.permissions?.some(
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

// **`src/common/guards/permission-ws.guard.ts`**

// ```ts
// import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
// import { Reflector } from '@nestjs/core';
// import { EntityType, ActionType } from '@prisma/client';
// import { PERMISSIONS_KEY } from '../decorators/permission.decorator'; // Assume you have this
// import { AuthUser } from '../../modules/auth/interfaces/auth-user.interface';

// @Injectable()
// export class PermissionWsGuard implements CanActivate {
//   constructor(private reflector: Reflector) {}

//   async canActivate(context: ExecutionContext): Promise<boolean> {
//     const { entity, action } = this.reflector.get<{ entity: EntityType; action: ActionType }>(
//       PERMISSIONS_KEY,
//       context.getHandler(),
//     ) || {};

//     if (!entity || !action) return true;

//     const client = context.switchToWs().getClient<Socket>();
//     const user: AuthUser = client.data.user;

//     if (!user) throw new ForbiddenException('User not authenticated');

//     if (user.role?.name === 'SUPER_ADMIN' || user.isOwner) return true;

//     const hasPermission = user.role?.permissions?.some(
//       (p) => p.entity === entity && p.action === action,
//     );

//     if (!hasPermission) {
//       throw new ForbiddenException(`No permission to ${action.toLowerCase()} ${entity.toLowerCase()}`);
//     }

//     return true;
//   }
// }
