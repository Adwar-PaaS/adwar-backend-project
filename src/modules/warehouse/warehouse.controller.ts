import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Patch,
  UseGuards,
  Query,
  HttpStatus,
} from '@nestjs/common';
import { WarehouseService } from './warehouse.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { IWarehouse } from './interfaces/warehouse.interface';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { APIResponse } from '../../common/utils/api-response.util';
import { SessionGuard } from '../../modules/auth/guards/session.guard';
import { AuthUser } from '../auth/interfaces/auth-user.interface';

@Controller('warehouses')
@UseGuards(SessionGuard, RolesGuard)
export class WarehouseController {
  constructor(private readonly service: WarehouseService) {}

  @Post()
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  async create(
    @Body() dto: CreateWarehouseDto,
    @CurrentUser() user: AuthUser,
  ): Promise<APIResponse<{ warehouse: IWarehouse }>> {
    const warehouse = await this.service.create(dto);
    return APIResponse.success({ warehouse }, 'Warehouse created successfully');
  }

  @Get()
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.OPERATION)
  async findAll(@Query() query: Record<string, any>) {
    const { data, total, page, limit, hasNext, hasPrev } =
      await this.service.findAll(query);

    return {
      statusCode: HttpStatus.OK,
      message: 'Fetched warehouses successfully',
      data: {
        warehouses: data,
        total,
        page,
        limit,
        hasNext,
        hasPrev,
      },
    };
  }

  @Get(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN, Role.OPERATION)
  async findOne(@Param('id') id: string): Promise<APIResponse<{ warehouse: IWarehouse }>> {
    const warehouse = await this.service.findById(id);
    return APIResponse.success({ warehouse }, 'Warehouse retrieved successfully');
  }

  @Patch(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateWarehouseDto,
  ): Promise<APIResponse<{ warehouse: IWarehouse }>> {
    const warehouse = await this.service.update(id, dto);
    return APIResponse.success({ warehouse }, 'Warehouse updated successfully');
  }

  @Delete(':id')
  @Roles(Role.SUPERADMIN, Role.ADMIN)
  async delete(@Param('id') id: string): Promise<APIResponse<null>> {
    await this.service.delete(id);
    return APIResponse.success(null, 'Warehouse deleted successfully');
  }
}
