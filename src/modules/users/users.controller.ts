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
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { SessionGuard } from '../../modules/auth/guards/session.guard';
import { APIResponse } from '../../common/utils/api-response.util';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@Controller('users')
@UseGuards(SessionGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  async create(@Body() dto: CreateUserDto) {
    const user = await this.usersService.create(dto);
    return APIResponse.success(
      { user },
      'User created successfully',
      HttpStatus.CREATED,
    );
  }

  @Get()
  @Roles(Role.SUPERADMIN)
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
  async findOne(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    return APIResponse.success({ user }, 'User retrieved successfully');
  }

  @Patch(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    const updatedUser = await this.usersService.update(id, dto);
    return APIResponse.success({ updatedUser }, 'User updated successfully');
  }

  @Patch(':id/status')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    const user = await this.usersService.updateStatus(id, dto.status);
    return APIResponse.success({ user }, 'User status updated successfully');
  }

  @Delete(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  async delete(@Param('id') id: string) {
    await this.usersService.delete(id);
    return APIResponse.success(
      null,
      'User deleted successfully',
      HttpStatus.NO_CONTENT,
    );
  }
}
