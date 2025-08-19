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
        (rp.permission.action === action || rp.permission.action === ActionType.ALL),
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
   */
  async createDefaultPermissions(roleId: string, roleName: RoleName) {
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
  }

  /**
   * Get all available permissions
   */
  async getAllPermissions() {
    return this.prisma.permission.findMany({
      orderBy: [{ entity: 'asc' }, { action: 'asc' }],
    });
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
   */
  private getDefaultPermissionsForRole(roleName: RoleName) {
    const permissions: { entity: EntityType; action: ActionType }[] = [];

    switch (roleName) {
      case RoleName.SUPERADMIN:
        // SUPERADMIN gets ALL permission for all entities
        Object.values(EntityType).forEach((entity) => {
          permissions.push({ entity, action: ActionType.ALL });
        });
        break;

      case RoleName.ADMIN:
        // ADMIN gets most permissions except some system-level ones
        permissions.push(
          { entity: EntityType.USER, action: ActionType.CREATE },
          { entity: EntityType.USER, action: ActionType.UPDATE },
          { entity: EntityType.USER, action: ActionType.VIEW },
          { entity: EntityType.TENANT, action: ActionType.UPDATE },
          { entity: EntityType.TENANT, action: ActionType.VIEW },
          { entity: EntityType.WAREHOUSE, action: ActionType.ALL },
          { entity: EntityType.ORDER, action: ActionType.ALL },
        );
        break;

      case RoleName.CUSTOMER:
        // CUSTOMER gets limited permissions
        permissions.push(
          { entity: EntityType.ORDER, action: ActionType.CREATE },
          { entity: EntityType.ORDER, action: ActionType.VIEW },
        );
        break;

      case RoleName.DRIVER:
        permissions.push(
          { entity: EntityType.ORDER, action: ActionType.UPDATE },
          { entity: EntityType.ORDER, action: ActionType.VIEW },
        );
        break;

      case RoleName.PACKER:
      case RoleName.PICKER:
        permissions.push(
          { entity: EntityType.ORDER, action: ActionType.UPDATE },
          { entity: EntityType.ORDER, action: ActionType.VIEW },
          { entity: EntityType.WAREHOUSE, action: ActionType.VIEW },
        );
        break;

      case RoleName.ACCOUNTANT:
        permissions.push(
          { entity: EntityType.ORDER, action: ActionType.VIEW },
          { entity: EntityType.USER, action: ActionType.VIEW },
        );
        break;

      case RoleName.OPERATION:
        permissions.push(
          { entity: EntityType.ORDER, action: ActionType.CREATE },
          { entity: EntityType.ORDER, action: ActionType.UPDATE },
          { entity: EntityType.ORDER, action: ActionType.VIEW },
          { entity: EntityType.WAREHOUSE, action: ActionType.UPDATE },
          { entity: EntityType.WAREHOUSE, action: ActionType.VIEW },
        );
        break;
    }

    return permissions;
  }
}
