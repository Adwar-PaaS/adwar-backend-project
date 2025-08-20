import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../../db/prisma/prisma.service';
import { AuthUser } from '../interfaces/auth-user.interface';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    if (!req?.session?.userId) {
      throw new UnauthorizedException('Not authenticated');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: req.session.userId },
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
        memberships: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: {
        id: user.role.id,
        name: user.role.name,
        permissions: user.role.permissions.map((p) => ({
          entity: p.entityType,
          action: p.actionType,
        })),
      },
      userTenants: user.memberships.map((ut) => ({
        tenantId: ut.tenantId,
        isOwner: ut.isOwner,
      })),
    };

    req.user = authUser;
    return true;
  }
}
