import { Prisma } from '@prisma/client';
import { baseFields, minimalFields } from './base.selector';

export const rolePermissionFields = {
  entityType: true,
  actions: true,
};

export const rolePermissionSelector: Prisma.RolePermissionSelect = {
  ...baseFields,
  ...rolePermissionFields,
};

export const limitedRolePermissionSelector: Prisma.RolePermissionSelect = {
  ...minimalFields,
  ...rolePermissionFields,
};

export const userPermissionFields = {
  entityType: true,
  allowed: true,
  denied: true,
};

export const userPermissionSelector: Prisma.UserPermissionSelect = {
  ...baseFields,
  ...userPermissionFields,
};

export const limitedUserPermissionSelector: Prisma.UserPermissionSelect = {
  ...minimalFields,
  ...userPermissionFields,
};
