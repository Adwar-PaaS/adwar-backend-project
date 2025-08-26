import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../db/prisma/prisma.service';
import { APIResponse } from '../../common/utils/api-response.util';

@Controller('test')
export class TestController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('permissions')
  async testPermissions() {
    // Test that permissions were seeded correctly
    const rolePermissionCount = await this.prisma.rolePermission.count();
    const roleCount = await this.prisma.role.count();
    const superAdminRole = await this.prisma.role.findFirst({
      where: { name: 'SUPER_ADMIN' },
      include: {
        permissions: true,
      },
    });

    return APIResponse.success({
      rolePermissionCount,
      roleCount,
      superAdminPermissions: superAdminRole?.permissions.length || 0,
      sample: superAdminRole?.permissions.slice(0, 3).map(rp => ({
        entity: rp.entityType,
        action: rp.actionType,
      })),
    }, 'Permission system test successful');
  }

  @Get('roles-with-permissions')
  async testRolesWithPermissions() {
    const roles = await this.prisma.role.findMany({
      include: {
        permissions: true,
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    return APIResponse.success({
      roles: roles.map(role => ({
        name: role.name,
        permissionCount: role.permissions.length,
        userCount: role._count.users,
        samplePermissions: role.permissions.slice(0, 3).map(rp => ({
          entity: rp.entityType,
          action: rp.actionType,
        })),
      })),
    }, 'Roles with permissions retrieved');
  }

  @Get('roles-array')
  async getRolesAsArray() {
    // This endpoint returns roles directly as an array for easier frontend consumption
    const roles = await this.prisma.role.findMany({
      include: {
        permissions: true,
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    const rolesData = roles.map(role => ({
      id: role.id,
      name: role.name,
      permissionCount: role.permissions.length,
      userCount: role._count.users,
      samplePermissions: role.permissions.slice(0, 3).map(rp => ({
        entity: rp.entityType,
        action: rp.actionType,
      })),
    }));

    return APIResponse.success(rolesData, 'Roles retrieved as array');
  }
}
