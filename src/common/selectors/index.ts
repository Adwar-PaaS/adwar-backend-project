const baseSelector = {
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
};

export const rolePermissionSelector = {
  id: true,
  entityType: true,
  actions: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
};

export const limitedRolePermissionSelector = {
  id: true,
  entityType: true,
  actions: true,
};

export const userPermissionSelector = {
  id: true,
  entityType: true,
  allowed: true,
  denied: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
};

export const limitedUserPermissionSelector = {
  id: true,
  entityType: true,
  allowed: true,
  denied: true,
};

export const roleSelector = {
  id: true,
  name: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
};

export const limitedRoleSelector = {
  id: true,
  name: true,
};

export const userSelector = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  avatar: true,
  phone: true,
  status: true,
  lastLoginAt: true,
  joinedAt: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
};

export const limitedUserSelector = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  avatar: true,
  phone: true,
  status: true,
};
