import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma/prisma.service';
import { EntityType, ActionType, RoleName } from '@prisma/client';

@Injectable()
export class RolesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createRoleWithPermissions(data: {
    name: RoleName;
    tenantId?: string;
    permissions: { entityType: EntityType; actionType: ActionType }[];
  }) {
    return this.prisma.role.create({
      data: {
        name: data.name,
        tenantId: data.tenantId ?? null,
        permissions: {
          create: data.permissions.map((p) => ({
            entityType: p.entityType,
            actionType: p.actionType,
          })),
        },
      },
      include: { permissions: true },
    });
  }

  async findById(id: string) {
    return this.prisma.role.findUnique({
      where: { id },
      include: { permissions: true },
    });
  }

  async deleteRole(id: string) {
    return this.prisma.role.delete({ where: { id } });
  }
}
