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
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { IUser } from './interfaces/user.interface';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { SessionGuard } from '../../modules/auth/guards/session.guard';

@Controller('users')
@UseGuards(SessionGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(Role.SUPERADMIN)
  async create(@Body() dto: CreateUserDto): Promise<IUser> {
    return this.usersService.create(dto);
  }

  @Get()
  @Roles(Role.SUPERADMIN)
  async findAll(@Query() query: Record<string, any>) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<IUser> {
    return this.usersService.findById(id);
  }

  @Patch(':id')
  @Roles(Role.SUPERADMIN, Role.TENANTADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateUserDto): Promise<IUser> {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPERADMIN, Role.TENANTADMIN)
  delete(@Param('id') id: string): Promise<{ success: boolean }> {
    return this.usersService.delete(id);
  }
}
