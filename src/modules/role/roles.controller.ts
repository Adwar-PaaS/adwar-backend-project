import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Delete,
  HttpStatus,
} from '@nestjs/common';
import { RolesService } from './roles.service';
import { APIResponse } from '../../common/utils/api-response.util';
import { Permissions } from '../../common/decorators/permission.decorator';
import { EntityType, ActionType } from '@prisma/client';
import { SessionGuard } from '../../modules/auth/guards/session.guard';
import { UseGuards } from '@nestjs/common';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { CreateRoleDto } from './dto/create-role.dto';
import { PermissionService } from 'src/shared/permission/permission.service';

@Controller('roles')
@UseGuards(SessionGuard, PermissionGuard)
export class RolesController {
  constructor(
    private readonly rolesService: RolesService,
    private readonly permissionService: PermissionService,
  ) {}

  @Post()
  @Permissions(EntityType.USER, ActionType.CREATE)
  async createRole(@Body() body: CreateRoleDto) {
    const role = await this.rolesService.createRoleWithPermissions(
      body.name,
      body.tenantId ?? null,
      body.permissions,
    );
    return APIResponse.success(
      { role },
      'Role created successfully',
      HttpStatus.CREATED,
    );
  }

  @Get('permissions')
  getEntitiesWithActions() {
    const data = this.permissionService.getEntitiesWithActions();
    return APIResponse.success(
      { permissions: data },
      'Permissions data retrieved successfully',
      HttpStatus.OK,
    );
  }

  @Get()
  @Permissions(EntityType.USER, ActionType.READ)
  getAllRoles() {
    const roles = this.permissionService.getAllRolesExcludingSuperAdmin();
    return APIResponse.success(
      { roles },
      'Roles retrieved successfully',
      HttpStatus.OK,
    );
  }

  @Get(':id')
  async getRole(@Param('id') id: string) {
    const role = await this.rolesService.getRoleById(id);
    return APIResponse.success(
      { role },
      'Role retrieved successfully',
      HttpStatus.OK,
    );
  }

  @Delete(':id')
  async deleteRole(@Param('id') id: string) {
    await this.rolesService.deleteRole(id);
    return APIResponse.success(
      null,
      'Role deleted successfully',
      HttpStatus.NO_CONTENT,
    );
  }
}
