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
          include: { permissions: true },
        },
        memberships: {
          include: {
            tenant: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const membership = user.memberships?.[0];

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      isOwner: membership?.isOwner ?? false,
      role: {
        id: user.role.id,
        name: user.role.name,
        permissions: user.role.permissions.flatMap((p) =>
          p.actionType.map((action) => ({
            entity: p.entityType,
            action: action,
          })),
        ),
      },
      tenant: membership
        ? {
            id: membership.tenantId,
            slug: membership.tenant.slug,
          }
        : undefined,
    };

    req.user = authUser;
    return true;
  }
}
