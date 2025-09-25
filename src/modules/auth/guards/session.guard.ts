import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../../db/prisma/prisma.service';
import { mapPrismaUserToAuthUser } from '../mappers/auth.mapper';
import { Status, RoleName } from '@prisma/client';
import { RedisService } from 'src/db/redis/redis.service';
import { AuthUser } from '../interfaces/auth-user.interface';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userId = req?.session?.userId;
    if (!userId) throw new UnauthorizedException('Not authenticated');

    const cacheKey = `auth:user:${userId}`;
    let user = await this.redis.get<AuthUser>(cacheKey);

    if (!user) {
      const prismaUser = await this.findUserWithRelations(userId);
      if (!prismaUser || prismaUser.status !== Status.ACTIVE) {
        throw new UnauthorizedException('User not found or inactive');
      }
      user = mapPrismaUserToAuthUser(prismaUser);
      await this.redis.set(cacheKey, user, 3600); // 1 hour TTL
    }

    const { domain, tenantSlug, isCustomerDomain } =
      this.extractDomainInfo(req);
    // this.validateAccess(user, tenantSlug, isCustomerDomain);

    req.user = user;
    return true;
  }

  private async findUserWithRelations(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      include: {
        role: { include: { permissions: true } },
        memberships: {
          include: {
            tenant: true,
            permissions: true,
          },
        },
      },
    });
  }

  private extractDomainInfo(req: any) {
    const host = req.get('host') || req.hostname;
    const domain = host.split(':')[0].toLowerCase();
    const parts = domain.split('.');

    const isCustomerDomain = domain.startsWith('customer.');
    const isTenantDomain = parts.length >= 3 && !isCustomerDomain;
    const tenantSlug = isTenantDomain ? parts[0] : null;

    return { domain, tenantSlug, isCustomerDomain };
  }

  private validateAccess(
    user: any,
    tenantSlug: string | null,
    isCustomerDomain: boolean,
  ) {
    if (tenantSlug) {
      this.validateTenantAccess(user, tenantSlug);
    } else if (isCustomerDomain) {
      this.validateCustomerDomainAccess(user);
    } else {
      this.validateRootDomainAccess(user);
    }
  }

  private validateTenantAccess(user: any, tenantSlug: string) {
    const activeMembership = user.memberships.find(
      (m: { tenant: { slug: string; status: string } }) =>
        m.tenant?.slug === tenantSlug && m.tenant?.status === Status.ACTIVE,
    );

    if (!activeMembership && user.role.name !== RoleName.SUPER_ADMIN) {
      throw new UnauthorizedException(`No access to tenant '${tenantSlug}'`);
    }
  }

  private validateCustomerDomainAccess(user: any) {
    if (user.role.name !== RoleName.CUSTOMER) {
      throw new UnauthorizedException(
        'Only customers can access customer domain',
      );
    }
    if (user.memberships.length > 0) {
      throw new UnauthorizedException(
        'Customers with tenant memberships cannot access customer domain',
      );
    }
  }

  private validateRootDomainAccess(user: any) {
    if (user.role.name !== RoleName.SUPER_ADMIN) {
      throw new UnauthorizedException(
        'Only super admins can access the root domain',
      );
    }
  }
}

//     if (!user) {
//       const prismaUser = await this.findUserWithRelations(userId);
//       if (!prismaUser || prismaUser.status !== Status.ACTIVE) {
//         throw new UnauthorizedException('User not found or inactive');
//       }
//       user = mapPrismaUserToAuthUser(prismaUser);
//       await this.redis.set(cacheKey, user, 3600); // 1 hour TTL
//     }

//     const { domain, tenantSlug, isCustomerDomain } =
//       this.extractDomainInfo(req);
//     // this.validateAccess(user, tenantSlug, isCustomerDomain);

//     req.user = user;
//     return true;
//   }

//   private async findUserWithRelations(userId: string) {
//     return this.prisma.user.findUnique({
//       where: { id: userId, deletedAt: null },
//       select: userSelector,
//     });
//   }

// include: {
//         role: { include: { permissions: true } },
//         memberships: {
//           where: {
//             deletedAt: null,
//             OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
//             tenant: { status: Status.ACTIVE, deletedAt: null },
//           },
//           include: {
//             tenant: true,
//             permissions: { where: { deletedAt: null } },
//           },
//         },
//       },
