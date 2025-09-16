import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../../db/prisma/prisma.service';
import { mapPrismaUserToAuthUser } from '../mappers/auth.mapper';

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
        memberships: {
          include: {
            tenant: true,
            permissions: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    req.user = mapPrismaUserToAuthUser(user);
    return true;
  }
}
