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
  UseInterceptors,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SessionGuard } from '../../modules/auth/guards/session.guard';
import { APIResponse } from '../../common/utils/api-response.util';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { Permissions } from '../../common/decorators/permission.decorator';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { PaginationResult } from '../../common/utils/api-features.util';
import { EntityType, ActionType } from '@prisma/client';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import {
  Cacheable,
  InvalidateCache,
} from '../../common/decorators/cache.decorator';
import {
  CacheInterceptor,
  InvalidateCacheInterceptor,
} from '../../common/interceptors/cache.interceptor';
import { mapUserView, mapUserViews, UserView } from './mappers/user.mapper';

@Controller('users')
@UseGuards(SessionGuard, PermissionGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseInterceptors(InvalidateCacheInterceptor)
  @InvalidateCache('users:*')
  // @Permissions(EntityType.USER, ActionType.CREATE)
  async create(@Body() dto: CreateUserDto) {
    const user = await this.usersService.create(dto);
    return APIResponse.success(
      { user },
      'User created successfully',
      HttpStatus.CREATED,
    );
  }

  @Post('super-admin/create-user')
  @UseInterceptors(InvalidateCacheInterceptor)
  @InvalidateCache('users:*')
  @Permissions(EntityType.USER, ActionType.CREATE)
  async createAdminUserViaSuperAdminWithRole(@Body() dto: CreateUserDto) {
    const user = await this.usersService.createUserViaSuperAdminWithRole(dto);
    return APIResponse.success(
      { user },
      'User created successfully',
      HttpStatus.CREATED,
    );
  }

  @Post('create-user-tenant')
  @UseInterceptors(InvalidateCacheInterceptor)
  @InvalidateCache('users:*')
  // @Permissions(EntityType.USER, ActionType.CREATE)
  async createTenantUser(
    @Body() dto: CreateUserDto,
    @CurrentUser() authUser: AuthUser,
  ) {
    const user = await this.usersService.createTenantUser(dto);
    return APIResponse.success(
      { user },
      'Tenant user created successfully',
      HttpStatus.CREATED,
    );
  }

  @Get()
  @UseInterceptors(CacheInterceptor)
  @Cacheable((req) => `users:page:${req.query.page || 1}`, 60)
  @Permissions(EntityType.USER, ActionType.READ)
  async findAll(
    @Query() query: Record<string, any>,
  ): Promise<APIResponse<{ users: UserView[] } & Partial<PaginationResult>>> {
    const { items, ...pagination } = await this.usersService.findAll(query);
    const users = mapUserViews(items);
    return APIResponse.success(
      { users, ...pagination },
      'Fetched users successfully',
      HttpStatus.OK,
    );
  }

  @Get(':id')
  @UseInterceptors(CacheInterceptor)
  @Cacheable((req) => `users:${req.params.id}`, 60)
  // @Permissions(EntityType.USER, ActionType.READ)
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    return APIResponse.success({ user }, 'User retrieved successfully');
  }

  @Put(':id')
  @UseInterceptors(InvalidateCacheInterceptor)
  @InvalidateCache('users:*', (req) => `users:${req.params.id}`)
  @Permissions(EntityType.USER, ActionType.UPDATE)
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    const updatedUser = await this.usersService.update(id, dto);
    return APIResponse.success({ updatedUser }, 'User updated successfully');
  }

  @Patch(':id/status')
  @UseInterceptors(InvalidateCacheInterceptor)
  @InvalidateCache((req) => `users:${req.params.id}`, 'users:*')
  @Permissions(EntityType.USER, ActionType.UPDATE)
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    const user = await this.usersService.updateStatus(id, dto.status);
    return APIResponse.success({ user }, 'User status updated successfully');
  }

  @Delete(':id')
  @UseInterceptors(InvalidateCacheInterceptor)
  @InvalidateCache((req) => `users:${req.params.id}`, 'users:*')
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
