import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../db/prisma/prisma.service';
import { APIResponse } from '../../common/utils/api-response.util';

@Controller('test')
export class TestController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('permissions')
  async testPermissions() {
    // Test that permissions were seeded correctly
    const permissionCount = await this.prisma.permission.count();
    const roleCount = await this.prisma.role.count();
    const superAdminRole = await this.prisma.role.findFirst({
      where: { name: 'SUPERADMIN' },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    return APIResponse.success({
      permissionCount,
      roleCount,
      superAdminPermissions: superAdminRole?.rolePermissions.length || 0,
      sample: superAdminRole?.rolePermissions.slice(0, 3).map(rp => ({
        entity: rp.permission.entity,
        action: rp.permission.action,
      })),
    }, 'Permission system test successful');
  }

  @Get('roles-with-permissions')
  async testRolesWithPermissions() {
    const roles = await this.prisma.role.findMany({
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

    return APIResponse.success({
      roles: roles.map(role => ({
        name: role.name,
        permissionCount: role.rolePermissions.length,
        userCount: role._count.users,
        samplePermissions: role.rolePermissions.slice(0, 3).map(rp => ({
          entity: rp.permission.entity,
          action: rp.permission.action,
        })),
      })),
    }, 'Roles with permissions retrieved');
  }
}
