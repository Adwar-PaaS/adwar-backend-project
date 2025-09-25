import { Prisma } from '@prisma/client';
import { baseFields, minimalFields } from './base.selector';
import { rolePermissionSelector } from './permission.selector';

export const roleFields = {
  name: true,
};

export const roleSelector: Prisma.RoleSelect = {
  ...baseFields,
  ...roleFields,
  permissions: {
    select: rolePermissionSelector,
  },
};

export const limitedRoleSelector: Prisma.RoleSelect = {
  ...minimalFields,
  ...roleFields,
};
