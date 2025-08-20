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
import { CreateRoleDto } from './dto/create-role.dto';
import { APIResponse } from '../../common/utils/api-response.util';
import { Permissions } from '../../common/decorators/permission.decorator';
import { EntityType, ActionType } from '@prisma/client';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @Permissions(EntityType.USER, ActionType.CREATE) // adjust if needed
  async createRole(@Body() dto: CreateRoleDto) {
    const role = await this.rolesService.createRole(dto);
    return APIResponse.success(
      { role },
      'Role created successfully',
      HttpStatus.CREATED,
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
