import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../db/prisma/prisma.service';
import { EntityType, ActionType, RoleName } from '@prisma/client';

@Injectable()
export class PermissionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if a user has permission to perform an action on an entity
   */
  async hasPermission(
    userId: string,
    entity: EntityType,
    action: ActionType,
  ): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!user || !user.role) {
      return false;
    }

    return user.role.rolePermissions.some(
      (rp) =>
        rp.permission.entity === entity && 
        rp.permission.action === action,
    );
  }

  /**
   * Get all permissions for a role
   */
  async getRolePermissions(roleId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return role?.rolePermissions.map(rp => rp.permission) || [];
  }

  /**
   * Create default permissions for a role
   * This method is deprecated and replaced by the new business-specific permission system
   */
  async createDefaultPermissions(roleId: string, roleName: RoleName) {
    // This method is no longer used as we now handle permissions via the frontend
    // and use business-specific entities
    console.log('createDefaultPermissions is deprecated - use manual permission assignment via frontend');
    return;

    /*
    // Old implementation commented out
    const defaultPermissions = this.getDefaultPermissionsForRole(roleName);
    
    for (const perm of defaultPermissions) {
      // Find or create the permission
      const permission = await this.prisma.permission.upsert({
        where: {
          entity_action: {
            entity: perm.entity,
            action: perm.action,
          },
        },
        update: {},
        create: {
          entity: perm.entity,
          action: perm.action,
        },
      });

      // Link to role
      await this.prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId,
            permissionId: permission.id,
          },
        },
        update: {},
        create: {
          roleId,
          permissionId: permission.id,
        },
      });
    }
    */
  }

  /**
   * Get all available permissions grouped by entity for frontend
   */
  async getAvailablePermissionsForFrontend() {
    const permissions = await this.prisma.permission.findMany({
      orderBy: [{ entity: 'asc' }, { action: 'asc' }],
    });

    // Group permissions by entity with user-friendly names
    const entityDisplayNames = {
      ORDERS: 'Orders',
      CUSTOMERS: 'Customers', 
      WAREHOUSES: 'Warehouses',
      USERS: 'Users',
      DRIVERS: 'Drivers',
      DRIVER_ORDERS: 'Driver Orders',
      TENANT_ORDERS: 'Tenant Orders',
      TENANT_CUSTOMERS: 'Tenant Customers',
      CUSTOMER_ORDERS: 'Customer Orders',
      TENANT_WAREHOUSES: 'Tenant Warehouses',
    };

    const actionDisplayNames = {
      ALL: 'ALL',
      CREATE: 'Create',
      UPDATE: 'Update',
      VIEW: 'View',
      RETRIEVE: 'Retrieve',
      ACTIVATE: 'Activate',
      DEACTIVATE: 'Deactivate',
    };

    const groupedPermissions = permissions.reduce((acc, permission) => {
      const entity = permission.entity;
      const entityDisplayName = entityDisplayNames[entity] || entity;
      
      if (!acc[entity]) {
        acc[entity] = {
          entityName: entity,
          displayName: entityDisplayName,
          actions: [],
        };
      }
      
      acc[entity].actions.push({
        id: permission.id,
        action: permission.action,
        displayName: actionDisplayNames[permission.action] || permission.action,
        description: `${actionDisplayNames[permission.action]} ${entityDisplayName}`,
      });
      
      return acc;
    }, {} as Record<string, {
      entityName: string;
      displayName: string;
      actions: Array<{
        id: string;
        action: ActionType;
        displayName: string;
        description: string;
      }>;
    }>);

    return Object.values(groupedPermissions);
  }

  /**
   * Create a new permission
   */
  async createPermission(entity: EntityType, action: ActionType) {
    return this.prisma.permission.upsert({
      where: {
        entity_action: { entity, action },
      },
      update: {},
      create: { entity, action },
    });
  }

  /**
   * Seed all basic permissions
   */
  async seedBasicPermissions() {
    const entities = Object.values(EntityType);
    const actions = Object.values(ActionType);

    for (const entity of entities) {
      for (const action of actions) {
        await this.createPermission(entity, action);
      }
    }
  }

  /**
   * Get default permissions based on role name
   * This method is deprecated and replaced by the new business-specific permission system
   */
  private getDefaultPermissionsForRole(roleName: RoleName) {
    // This method is no longer used as we now use business-specific entities
    // and the frontend handles permission assignment via checkboxes
    return [];

    /* 
    // Old implementation commented out due to deprecated enum values
    const permissions: { entity: EntityType; action: ActionType }[] = [];

    switch (roleName) {
      case RoleName.SUPERADMIN:
        // SUPERADMIN gets most permissions
        Object.values(EntityType).forEach((entity) => {
          Object.values(ActionType).forEach((action) => {
            permissions.push({ entity, action });
          });
        });
        break;

      case RoleName.ADMIN:
        // ADMIN gets most permissions except some system-level ones
        permissions.push(
          { entity: EntityType.USERS, action: ActionType.CREATE },
          { entity: EntityType.USERS, action: ActionType.UPDATE },
          { entity: EntityType.USERS, action: ActionType.VIEW },
          { entity: EntityType.WAREHOUSES, action: ActionType.VIEW },
          { entity: EntityType.ORDERS, action: ActionType.CREATE },
          { entity: EntityType.ORDERS, action: ActionType.UPDATE },
          { entity: EntityType.ORDERS, action: ActionType.VIEW },
        );
        break;

      case RoleName.CUSTOMER:
        // CUSTOMER gets limited permissions
        permissions.push(
          { entity: EntityType.ORDERS, action: ActionType.CREATE },
          { entity: EntityType.ORDERS, action: ActionType.VIEW },
        );
        break;

      case RoleName.DRIVER:
        permissions.push(
          { entity: EntityType.DRIVER_ORDERS, action: ActionType.UPDATE },
          { entity: EntityType.DRIVER_ORDERS, action: ActionType.VIEW },
        );
        break;

      case RoleName.OPERATION:
        permissions.push(
          { entity: EntityType.ORDERS, action: ActionType.CREATE },
          { entity: EntityType.ORDERS, action: ActionType.UPDATE },
          { entity: EntityType.ORDERS, action: ActionType.VIEW },
          { entity: EntityType.WAREHOUSES, action: ActionType.UPDATE },
          { entity: EntityType.WAREHOUSES, action: ActionType.VIEW },
        );
        break;
    }

    return permissions;
    */
  }
}
