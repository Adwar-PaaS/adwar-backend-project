import { HttpStatus } from '@nestjs/common';
import { ApiError } from '../../../common/exceptions/api-error.exception';
import { AuthUser } from '../interfaces/auth-user.interface';

export function mapPrismaUserToAuthUser(user: any): AuthUser {
  if (!user) {
    throw new ApiError('User not found', HttpStatus.NOT_FOUND);
  }

  const membership = user.memberships?.[0];

  const membershipPermissions =
    membership?.permissions?.flatMap((perm: any) =>
      perm.actionType.map((action: any) => ({
        entity: perm.entityType,
        action,
      })),
    ) ?? [];

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    role: {
      id: user.role?.id,
      name: user.role?.name,
      permissions: membershipPermissions,
    },
    tenant: {
      id: membership?.tenant?.id ?? null,
      slug: membership?.tenant?.slug ?? null,
    },
  };
}
