import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma/prisma.service';
import { EntityType, ActionType, RoleName } from '@prisma/client';
import { getEntityActionsMap } from '../../common/utils/entity-actions-map.util';

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
            permissions: true, // ✅ fixed: matches `Role.permissions`
          },
        },
      },
    });

    if (!user?.role) {
      return false;
    }

    return user.role.permissions.some(
      (rp) => rp.entityType === entity && rp.actionType === action,
    );
  }

  /**
   * Get all permissions for a role
   */
  async getRolePermissions(roleId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: { permissions: true },
    });

    return role?.permissions ?? [];
  }

  /**
   * Get all entities and actions (for UI checkboxes, etc.)
   */
  getEntitiesWithActions() {
    return getEntityActionsMap();
  }

  /**
   * Get all available permissions from DB grouped by entity
   */
  async getAvailablePermissionsForFrontend() {
    const permissions = await this.prisma.rolePermission.findMany({
      orderBy: [{ entityType: 'asc' }, { actionType: 'asc' }],
    });

    const grouped = permissions.reduce(
      (acc, perm) => {
        if (!acc[perm.entityType]) {
          acc[perm.entityType] = {
            entity: perm.entityType,
            actions: [],
          };
        }
        acc[perm.entityType].actions.push({
          id: perm.id,
          action: perm.actionType,
          description: `${perm.actionType} ${perm.entityType}`,
        });
        return acc;
      },
      {} as Record<
        string,
        {
          entity: EntityType;
          actions: { id: string; action: ActionType; description: string }[];
        }
      >,
    );

    return Object.values(grouped);
  }

  /**
   * Create a new role permission
   */
  async createRolePermission(
    roleId: string,
    entity: EntityType,
    action: ActionType,
  ) {
    return this.prisma.rolePermission.upsert({
      where: {
        roleId_entityType_actionType: {
          roleId,
          entityType: entity,
          actionType: action,
        },
      },
      update: {},
      create: { roleId, entityType: entity, actionType: action },
    });
  }

  /**
   * Seed all basic permissions for all entities & actions
   */
  async seedBasicPermissionsForRole(roleId: string) {
    const entities = Object.values(EntityType);
    const actions = Object.values(ActionType);

    for (const entity of entities) {
      for (const action of actions) {
        await this.createRolePermission(roleId, entity, action);
      }
    }
  }

  /**
   * Deprecated: role-specific default permissions
   */
  private getDefaultPermissionsForRole(_roleName: RoleName) {
    return []; // ❌ not used anymore
  }
}
