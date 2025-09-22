import { HttpStatus } from '@nestjs/common';
import { ApiError } from '../../../common/exceptions/api-error.exception';
import { AuthUser } from '../interfaces/auth-user.interface';
import { ActionType, EntityType } from '@prisma/client';

export function mapPrismaUserToAuthUser(user: any): AuthUser {
  if (!user) {
    throw new ApiError('User not found', HttpStatus.NOT_FOUND);
  }

  const membership = user.memberships?.[0];
  const rolePermissions = user.role?.permissions ?? [];
  const userPermissions = membership?.permissions ?? [];

  const entityToActions = mergePermissions(rolePermissions, userPermissions);

  const permissions = Array.from(entityToActions.entries()).map(
    ([entity, actions]) => ({
      entity,
      actions: Array.from(actions),
    }),
  );

  return {
    id: user.id,
    email: user.email,
    fullName: [user.firstName, user.lastName].filter(Boolean).join(' '),
    role: {
      id: user.role?.id,
      name: user.role?.name,
      permissions,
    },
    tenant: membership?.tenant
      ? { id: membership.tenant.id, slug: membership.tenant.slug }
      : { id: null, slug: null },
  };
}

function mergePermissions(rolePermissions: any[], userPermissions: any[]) {
  const entityToActions = new Map<EntityType, Set<ActionType>>();

  for (const rp of rolePermissions) {
    entityToActions.set(rp.entityType, new Set(rp.actions));
  }

  for (const up of userPermissions) {
    const entity = up.entityType;
    const current = entityToActions.get(entity) || new Set<ActionType>();

    const roleHadAll = current.has(ActionType.ALL);

    up.allowed.forEach((a: ActionType) => current.add(a));
    up.denied.forEach((d: ActionType) => current.delete(d));

    if (roleHadAll) {
      const allActions = Object.values(ActionType).filter(
        (a) => a !== ActionType.ALL,
      ) as ActionType[];

      const modified = up.allowed.length > 0 || up.denied.length > 0;
      if (modified) {
        current.delete(ActionType.ALL);
        allActions.forEach((a) => current.add(a));
        up.denied.forEach((d: ActionType) => current.delete(d));
      } else {
        current.clear();
        current.add(ActionType.ALL);
      }
    }

    entityToActions.set(entity, current);
  }

  return entityToActions;
}
