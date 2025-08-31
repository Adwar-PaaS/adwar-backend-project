import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma/prisma.service';
import { EntityType, ActionType, RoleName, Role } from '@prisma/client';
import { BaseRepository } from '../../shared/factory/base.repository';
import { PermissionService } from 'src/shared/permission/permission.service';

@Injectable()
export class RolesRepository extends BaseRepository<Role> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma, prisma.role, ['name']);
  }

  async createRoleWithPermissions(
    name: RoleName,
    tenantId: string | null,
    permissions: { entityType: EntityType; actionTypes: ActionType[] }[],
  ) {
    return this.prisma.role.create({
      data: {
        name,
        tenantId,
        permissions: {
          create: permissions.map((p) => ({
            entityType: p.entityType,
            actionType: p.actionTypes,
          })),
        },
      },
      include: {
        permissions: true,
      },
    });
  }

  async addPermissionsToRole(
    roleId: string,
    permissions: { entityType: EntityType; actionTypes: ActionType[] }[],
  ) {
    return this.prisma.role.update({
      where: { id: roleId },
      data: {
        permissions: {
          create: permissions.map((p) => ({
            entityType: p.entityType,
            actionType: p.actionTypes,
          })),
        },
      },
      include: { permissions: true },
    });
  }

  async findById(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          select: {
            entityType: true,
            actionType: true,
          },
        },
      },
    });

    if (!role) return null;

    role.permissions = role.permissions.map((p) => ({
      ...p,
      actionType: Array.isArray(p.actionType)
        ? (p.actionType as ActionType[])
        : [p.actionType as ActionType],
    }));

    return role;
  }

  async deleteRole(id: string) {
    return this.prisma.role.delete({ where: { id } });
  }
}
