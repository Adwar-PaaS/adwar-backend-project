import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../db/prisma/prisma.service';
import { EntityType, ActionType, RoleName, Role } from '@prisma/client';
import { BaseRepository } from '../../shared/factory/base.repository';

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
    if (name !== RoleName.CUSTOMER) {
      const existingRole = await this.prisma.role.findFirst({
        where: {
          name,
          tenantId,
          deletedAt: null,
        },
      });

      if (existingRole) {
        throw new BadRequestException(
          `Role "${name}" already exists for this tenant.`,
        );
      }
    }

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

  async findById(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: {
          select: {
            entityType: true,
            actions: true,
          },
        },
      },
    });

    if (!role) return null;

    role.permissions = role.permissions.map((p) => ({
      ...p,
      actionType: Array.isArray(p.actions)
        ? (p.actions as ActionType[])
        : [p.actions as ActionType],
    }));

    return role;
  }

  async deleteRole(id: string) {
    return this.prisma.role.delete({ where: { id } });
  }
}
