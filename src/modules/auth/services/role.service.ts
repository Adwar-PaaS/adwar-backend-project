import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../db/prisma/prisma.service';
import { RoleName, EntityType, ActionType } from '@prisma/client';
import { PermissionService } from './permission.service';

@Injectable()
export class RoleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissionService: PermissionService,
  ) {}

  /**
   * Create a new role with default permissions
   */
  async createRole(name: RoleName, tenantId?: string) {
    const role = await this.prisma.role.create({
      data: {
        name,
        tenantId,
      },
    });

    // Add default permissions for this role
    await this.permissionService.createDefaultPermissions(role.id, name);

    return this.prisma.role.findUnique({
      where: { id: role.id },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  /**
   * Get all roles with their permissions
   */
  async getAllRoles(tenantId?: string) {
    return this.prisma.role.findMany({
      where: tenantId ? { tenantId } : { tenantId: null },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
    });
  }

  /**
   * Get role by name
   */
  async getRoleByName(name: RoleName, tenantId?: string) {
    return this.prisma.role.findFirst({
      where: {
        name,
        tenantId: tenantId || null,
      },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  /**
   * Update role permissions
   */
  async updateRolePermissions(
    roleId: string,
    permissionIds: string[],
  ) {
    // Remove all existing permissions
    await this.prisma.rolePermission.deleteMany({
      where: { roleId },
    });

    // Add new permissions
    await this.prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId) => ({
        roleId,
        permissionId,
      })),
    });

    return this.prisma.role.findUnique({
      where: { id: roleId },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });
  }

  /**
   * Get all available permissions (for frontend to display)
   */
  async getAvailablePermissions() {
    const permissions = await this.prisma.permission.findMany({
      orderBy: [{ entity: 'asc' }, { action: 'asc' }],
    });

    // Group permissions by entity for easier frontend handling
    const groupedPermissions = permissions.reduce((acc, permission) => {
      const entity = permission.entity;
      if (!acc[entity]) {
        acc[entity] = [];
      }
      acc[entity].push({
        id: permission.id,
        action: permission.action,
        description: `${permission.action.toLowerCase()} ${entity.toLowerCase()}`,
      });
      return acc;
    }, {} as Record<string, Array<{ id: string; action: ActionType; description: string }>>);

    return groupedPermissions;
  }

  /**
   * Get role with formatted permissions for frontend
   */
  async getRoleWithFormattedPermissions(roleId: string) {
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

    if (!role) return null;

    const permissions = await this.getAvailablePermissions();
    
    // Mark which permissions this role has
    const rolePermissionIds = new Set(
      role.rolePermissions.map(rp => rp.permission.id)
    );

    const formattedPermissions = Object.entries(permissions).map(([entity, actions]) => ({
      entity,
      actions: actions.map(action => ({
        ...action,
        assigned: rolePermissionIds.has(action.id),
      })),
    }));

    return {
      id: role.id,
      name: role.name,
      tenantId: role.tenantId,
      permissions: formattedPermissions,
    };
  }
}
