import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  Patch,
  UseGuards,
  HttpStatus,
  Put,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SessionGuard } from '../../modules/auth/guards/session.guard';
import { APIResponse } from '../../common/utils/api-response.util';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { Permissions } from '../../common/decorators/permission.decorator';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { EntityType, ActionType } from '@prisma/client';
import { CreateTenantUserDto } from './dto/create-tenant-user.dto';

@Controller('users')
@UseGuards(SessionGuard, PermissionGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Permissions(EntityType.USER, ActionType.CREATE)
  async create(@Body() dto: CreateUserDto) {
    const user = await this.usersService.create(dto);
    return APIResponse.success(
      { user },
      'User created successfully',
      HttpStatus.CREATED,
    );
  }

  @Post('tenant')
  @Permissions(EntityType.USER, ActionType.CREATE)
  async createTenantUser(@Body() dto: CreateTenantUserDto) {
    const user = await this.usersService.createTenantUser(dto);
    return APIResponse.success(
      { user },
      'Tenant user created successfully',
      HttpStatus.CREATED,
    );
  }

  @Get()
  @Permissions(EntityType.USER, ActionType.READ)
  async findAll(@Query() query: Record<string, any>) {
    const { data, total, page, limit, hasNext, hasPrev } =
      await this.usersService.findAll(query);

    return {
      statusCode: HttpStatus.OK,
      message: 'Fetched users successfully',
      data: {
        users: data,
        total,
        page,
        limit,
        hasNext,
        hasPrev,
      },
    };
  }

  @Get(':id')
  @Permissions(EntityType.USER, ActionType.READ)
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    return APIResponse.success({ user }, 'User retrieved successfully');
  }

  @Put(':id')
  @Permissions(EntityType.USER, ActionType.UPDATE)
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    const updatedUser = await this.usersService.update(id, dto);
    return APIResponse.success({ updatedUser }, 'User updated successfully');
  }

  @Patch(':id/status')
  @Permissions(EntityType.USER, ActionType.UPDATE)
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    const user = await this.usersService.updateStatus(id, dto.status);
    return APIResponse.success({ user }, 'User status updated successfully');
  }

  @Delete(':id')
  @Permissions(EntityType.USER, ActionType.DELETE)
  async delete(@Param('id') id: string) {
    await this.usersService.delete(id);
    return APIResponse.success(
      null,
      'User deleted successfully',
      HttpStatus.NO_CONTENT,
    );
  }
}
