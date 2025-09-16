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
  const userPerms = membership?.permissions ?? [];

  const entityToActions = new Map<EntityType, Set<ActionType>>();

  for (const rp of rolePermissions) {
    entityToActions.set(rp.entityType, new Set(rp.actions));
  }

  for (const up of userPerms) {
    const entity = up.entityType;
    let actions = entityToActions.get(entity) || new Set<ActionType>();
    up.allowed.forEach((a: ActionType) => actions.add(a));
    up.denied.forEach((d: ActionType) => actions.delete(d));
    entityToActions.set(entity, actions);
  }

  const permissions: { entity: EntityType; action: ActionType }[] = [];
  for (const [entity, actionsSet] of entityToActions.entries()) {
    for (const action of actionsSet) {
      permissions.push({ entity, action });
    }
  }

  return {
    id: user.id,
    email: user.email,
    fullName: `${user.firstName} ${user.lastName}`,
    role: {
      id: user.role?.id,
      name: user.role?.name,
      permissions,
    },
    tenant: {
      id: membership?.tenant?.id ?? null,
      slug: membership?.tenant?.slug ?? null,
    },
  };
}
