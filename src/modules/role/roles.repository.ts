import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma/prisma.service';
import { EntityType, ActionType, RoleName, Role } from '@prisma/client';
import { BaseRepository } from '../../shared/factory/base.repository';

@Injectable()
export class RolesRepository extends BaseRepository<Role> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma, prisma.role, ['name']);
  }

  async addPermissionsToRole(
    roleId: string,
    permissions: { entityType: EntityType; actionTypes: ActionType[] }[],
  ) {
    return this.prisma.role.update({
      where: { id: roleId },
      data: {
        permissions: {
          createMany: {
            data: permissions.map((p) => ({
              entityType: p.entityType,
              actionType: p.actionTypes,
            })),
            skipDuplicates: true,
          },
        },
      },
      include: { permissions: true },
    });
  }

  async findAllRolesWithoutSuperAdmin() {
    return this.prisma.role.findMany({
      where: { name: { not: RoleName.SUPER_ADMIN } },
    });
  }

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
