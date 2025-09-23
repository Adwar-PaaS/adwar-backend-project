import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../db/prisma/prisma.service';
import { EntityType, ActionType, RoleName, Role } from '@prisma/client';
import { BaseRepository } from '../../shared/factory/base.repository';
import { RedisService } from 'src/db/redis/redis.service';

@Injectable()
export class RolesRepository extends BaseRepository<Role> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly redis: RedisService,
  ) {
    super(prisma, redis, 'role', ['name']);
  }

  async createRoleWithPermissions(
    name: RoleName,
    tenantId: string | null,
    permissions: { entityType: EntityType; actionTypes: ActionType[] }[],
  ) {
    const existingRole = await this.prisma.role.findFirst({
      where: { name, tenantId, deletedAt: null },
    });

    if (existingRole) {
      throw new BadRequestException(
        `Role "${name}" already exists for this tenant.`,
      );
    }

    return this.prisma.role.create({
      data: {
        name,
        tenantId,
        permissions: {
          create: permissions.map((p) => ({
            entityType: p.entityType,
            actions: p.actionTypes,
          })),
        },
      },
      include: { permissions: true },
    });
  }

  async findById(id: string) {
    return this.prisma.role.findUnique({
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
  }

  async deleteRole(id: string) {
    return this.prisma.role.delete({ where: { id } });
  }
}
