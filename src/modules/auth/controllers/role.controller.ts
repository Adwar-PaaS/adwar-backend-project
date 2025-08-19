import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  UseGuards,
  Query,
} from '@nestjs/common';
import { RoleService } from '../services/role.service';
import { PermissionService } from '../services/permission.service';
import { SessionGuard } from '../guards/session.guard';
import { PermissionGuard } from '../../../common/guards/enhanced-permission.guard';
import { Permissions } from '../../../common/decorators/permission.decorator';
import { EntityType, ActionType, RoleName } from '@prisma/client';
import { APIResponse } from '../../../common/utils/api-response.util';

@Controller('roles')
@UseGuards(SessionGuard, PermissionGuard)
export class RoleController {
  constructor(
    private readonly roleService: RoleService,
    private readonly permissionService: PermissionService,
  ) {}

  /**
   * Get all available permissions grouped by entity
   * This is what your frontend will call to display the permission checkboxes
   */
  @Get('permissions/available')
  @Permissions(EntityType.USER, ActionType.VIEW)
  async getAvailablePermissions() {
    const permissions = await this.roleService.getAvailablePermissions();
    return APIResponse.success({ permissions }, 'Available permissions retrieved');
  }

  /**
   * Seed all basic permissions (run this once to populate permissions table)
   */
  @Post('permissions/seed')
  @Permissions(EntityType.USER, ActionType.CREATE)
  async seedPermissions() {
    await this.permissionService.seedBasicPermissions();
    return APIResponse.success(null, 'Permissions seeded successfully');
  }

  /**
   * Get all roles with their permissions
   */
  @Get()
  @Permissions(EntityType.USER, ActionType.VIEW)
  async getAllRoles(@Query('tenantId') tenantId?: string) {
    const roles = await this.roleService.getAllRoles(tenantId);
    return APIResponse.success({ roles }, 'Roles retrieved successfully');
  }

  /**
   * Get a single role with formatted permissions for editing
   * This will show which permissions are currently assigned vs available
   */
  @Get(':roleId')
  @Permissions(EntityType.USER, ActionType.VIEW)
  async getRole(@Param('roleId') roleId: string) {
    const role = await this.roleService.getRoleWithFormattedPermissions(roleId);
    if (!role) {
      return APIResponse.error('Role not found', 404);
    }
    return APIResponse.success({ role }, 'Role retrieved successfully');
  }

  /**
   * Create a new role with selected permissions
   * Body: { name: string, tenantId?: string, permissionIds: string[] }
   */
  @Post()
  @Permissions(EntityType.USER, ActionType.CREATE)
  async createRole(@Body() createRoleDto: { 
    name: RoleName; 
    tenantId?: string; 
    permissionIds?: string[];
  }) {
    // Create the role first
    const role = await this.roleService.createRole(createRoleDto.name, createRoleDto.tenantId);
    
    // If specific permissions are provided, update them
    if (createRoleDto.permissionIds && createRoleDto.permissionIds.length > 0) {
      await this.roleService.updateRolePermissions(role!.id, createRoleDto.permissionIds);
    }

    const finalRole = await this.roleService.getRoleWithFormattedPermissions(role!.id);
    return APIResponse.success({ role: finalRole }, 'Role created successfully');
  }

  /**
   * Update role permissions
   * Body: { permissionIds: string[] }
   */
  @Put(':roleId/permissions')
  @Permissions(EntityType.USER, ActionType.UPDATE)
  async updateRolePermissions(
    @Param('roleId') roleId: string,
    @Body() updatePermissionsDto: { permissionIds: string[] },
  ) {
    const role = await this.roleService.updateRolePermissions(
      roleId,
      updatePermissionsDto.permissionIds,
    );
    return APIResponse.success({ role }, 'Role permissions updated successfully');
  }

  /**
   * Get roles by name (useful for user creation)
   */
  @Get('by-name/:roleName')
  @Permissions(EntityType.USER, ActionType.VIEW)
  async getRoleByName(
    @Param('roleName') roleName: RoleName,
    @Query('tenantId') tenantId?: string,
  ) {
    const role = await this.roleService.getRoleByName(roleName, tenantId);
    if (!role) {
      return APIResponse.error('Role not found', 404);
    }
    return APIResponse.success({ role }, 'Role retrieved successfully');
  }
}
