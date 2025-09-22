import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import type { AuthUser } from '../../modules/auth/interfaces/auth-user.interface';
import { DomainType } from '../enums/domain.enum';
import { DOMAIN_TYPE_KEY } from '../decorators/domain-type.decorator';
import { RoleName } from '@prisma/client';

@Injectable()
export class DomainAccessGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredDomainType = this.reflector.getAllAndOverride<DomainType>(
      DOMAIN_TYPE_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthUser }>();
    const host = request.get('host') || request.hostname;
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    const actualDomainType = this.extractDomainType(host);

    this.validateDomainAccess(actualDomainType, user, host);

    if (requiredDomainType && actualDomainType !== requiredDomainType) {
      throw new ForbiddenException(
        `Access denied. Requires ${requiredDomainType} domain`,
      );
    }

    return true;
  }

  private extractDomainType(host: string): DomainType {
    const domain = host.split(':')[0].toLowerCase();
    const parts = domain.split('.');

    if (domain.startsWith('customer.')) {
      return DomainType.CUSTOMER;
    }

    if (parts.length === 2) {
      return DomainType.ROOT; // e.g. sitename.com
    }

    if (parts.length >= 3 && !domain.startsWith('customer.')) {
      return DomainType.TENANT;
    }

    throw new ForbiddenException('Invalid domain format');
  }

  private extractTenantSlugFromHost(host: string): string {
    const domain = host.split(':')[0].toLowerCase();
    const parts = domain.split('.');
    if (parts.length >= 3 && !domain.startsWith('customer.')) {
      return parts[0];
    }
    throw new ForbiddenException('Invalid tenant domain');
  }

  private validateDomainAccess(
    actualDomainType: DomainType,
    user: AuthUser,
    host: string,
  ): void {
    switch (actualDomainType) {
      case DomainType.ROOT:
        this.validateRootAccess(user);
        break;
      case DomainType.CUSTOMER:
        this.validateCustomerAccess(user);
        break;
      case DomainType.TENANT:
        this.validateTenantAccess(user, host);
        break;
      default:
        throw new ForbiddenException('Invalid domain type');
    }
  }

  private validateRootAccess(user: AuthUser): void {
    if (user.role.name !== RoleName.SUPER_ADMIN) {
      throw new ForbiddenException('Only super admins can access root domain');
    }
  }

  private validateCustomerAccess(user: AuthUser): void {
    if (user.role.name !== RoleName.CUSTOMER) {
      throw new ForbiddenException('Only customers can access customer domain');
    }

    if (user.tenant) {
      throw new ForbiddenException(
        'Customers cannot access customer domain while having tenant membership',
      );
    }
  }

  private validateTenantAccess(user: AuthUser, host: string): void {
    if (user.role.name === RoleName.CUSTOMER) {
      throw new ForbiddenException('Customers cannot access tenant domains');
    }

    const tenantSlug = this.extractTenantSlugFromHost(host);

    if (!user.tenant || user.tenant.slug !== tenantSlug) {
      throw new ForbiddenException(
        `Access denied. User does not belong to tenant '${tenantSlug}'`,
      );
    }
  }
}
