import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RoleName } from '@prisma/client';
import { AuthUser } from '../../modules/auth/interfaces/auth-user.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleName[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const req = context.switchToHttp().getRequest();
    const user: AuthUser | undefined = req.user;

    if (!user?.role?.name) {
      throw new ForbiddenException('User role not found');
    }

    if (!requiredRoles.includes(user.role.name)) {
      throw new ForbiddenException(`Access denied for role ${user.role.name}`);
    }

    return true;
  }
}
