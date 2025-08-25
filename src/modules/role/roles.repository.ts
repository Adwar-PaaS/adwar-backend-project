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

  async getPermissionsOfRole(roleId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id: roleId },
      include: { permissions: true },
    });
    if (!role) return null;
    role.permissions = role.permissions.map((p: any) => ({
      ...p,
      actionType: p.actionType.map((a: string) => a as ActionType),
    }));
    return role.permissions;
  }

  // async findAllRolesWithoutSuperAdmin() {
  //   return this.prisma.role.findMany({
  //     where: { name: { not: RoleName.SUPER_ADMIN } },
  //   });
  // }

  async findById(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { permissions: true },
    });

    if (!role) return null;

    role.permissions = role.permissions.map((p: any) => ({
      ...p,
      actionType: p.actionType.map((a: string) => a as ActionType),
    }));

    return role;
  }

  async deleteRole(id: string) {
    return this.prisma.role.delete({ where: { id } });
  }
}
