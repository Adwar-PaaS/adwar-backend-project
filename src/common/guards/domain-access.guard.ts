// import {
//   Injectable,
//   CanActivate,
//   ExecutionContext,
//   ForbiddenException,
//   UnauthorizedException,
// } from '@nestjs/common';
// import { Reflector } from '@nestjs/core';
// import { Request } from 'express';
// import { DomainType } from '../enums/domain.enum';
// import { DOMAIN_TYPE_KEY } from '../decorators/domain-type.decorator';

// @Injectable()
// export class DomainAccessGuard implements CanActivate {
//   constructor(private reflector: Reflector) {}

//   canActivate(context: ExecutionContext): boolean {
//     const requiredDomainType = this.reflector.getAllAndOverride<DomainType>(
//       DOMAIN_TYPE_KEY,
//       [context.getHandler(), context.getClass()],
//     );

//     if (!requiredDomainType) {
//       return true; // No domain restriction specified
//     }

//     const request = context.switchToHttp().getRequest<Request>();
//     const host = request.get('host') || request.hostname;
    
//     const actualDomainType = this.extractDomainType(host);
//     const user = request.user;

//     // Check if user is authenticated
//     if (!user) {
//       throw new UnauthorizedException('User not authenticated');
//     }

//     // Validate domain access
//     this.validateDomainAccess(actualDomainType, requiredDomainType, user);

//     return true;
//   }

//   private extractDomainType(host: string): DomainType {
//     // Remove port if present
//     const domain = host.split(':')[0];
    
//     // Check if it's a customer domain (customer.logisticsTech.com)
//     if (domain.startsWith('customer.')) {
//       return DomainType.CUSTOMER;
//     }
    
//     // tenant domains have format: {slug}.logisticsTech.com
//     const parts = domain.split('.');
//     if (parts.length >= 3 && !domain.startsWith('customer.')) {
//       return DomainType.TENANT;
//     }

//     throw new ForbiddenException('Invalid domain format');
//   }

//   private validateDomainAccess(
//     actualDomainType: DomainType,
//     requiredDomainType: DomainType,
//     user: any,
//   ): void {
//     // Check if domain types match
//     if (actualDomainType !== requiredDomainType) {
//       throw new ForbiddenException(
//         `Access denied. This endpoint requires ${requiredDomainType} domain access`
//       );
//     }

//     // Additional validation based on domain type
//     if (actualDomainType === DomainType.CUSTOMER) {
//       this.validateCustomerAccess(user);
//     } else if (actualDomainType === DomainType.TENANT) {
//       this.validateTenantAccess(user);
//     }
//   }

//   private validateCustomerAccess(user: any): void {
//     // Validate that user has customer role
//     if (user.role?.name !== 'CUSTOMER') {
//       throw new ForbiddenException(
//         'Only customers can access customer domain'
//       );
//     }

//     // Validate that user has customerSubdomain set
//     if (!user.customerSubdomain) {
//       throw new ForbiddenException(
//         'Customer account not properly configured for subdomain access'
//       );
//     }
//   }

//   private validateTenantAccess(user: any): void {
//     // Validate that user is not a customer or has tenant membership
//     if (user.role?.name === 'CUSTOMER' && !user.memberships?.length) {
//       throw new ForbiddenException(
//         'Customers cannot access tenant domains directly'
//       );
//     }
//   }
// }
