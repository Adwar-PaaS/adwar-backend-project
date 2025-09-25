import { Prisma } from '@prisma/client';
import { baseFields, minimalFields } from './base.selector';
import { roleSelector } from './role.selector';
import { userPermissionSelector } from './permission.selector';
import { tenantSelector } from './tenant.selector';
import { makeSelector } from '../utils/selector.util';

export const userFields = {
  email: true,
  password: true,
  firstName: true,
  lastName: true,
  avatar: true,
  phone: true,
  status: true,
  lastLoginAt: true,
  joinedAt: true,
};

export const userSelector = makeSelector<Prisma.UserSelect>({
  ...baseFields,
  ...userFields,
  role: { select: roleSelector },
  memberships: {
    select: {
      tenant: { select: tenantSelector },
      permissions: { select: userPermissionSelector },
    },
  },
});

export const limitedUserSelector = makeSelector<Prisma.UserSelect>({
  ...minimalFields,
  ...userFields,
});
