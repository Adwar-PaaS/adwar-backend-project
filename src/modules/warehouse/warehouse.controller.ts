import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
} from '@nestjs/common';
import { WarehouseService } from './warehouse.service';
import { APIResponse } from '../../common/utils/api-response.util';
import { Permissions } from '../../common/decorators/permission.decorator';
import { EntityType, ActionType } from '@prisma/client';
import { SessionGuard } from '../../modules/auth/guards/session.guard';
import { UseGuards } from '@nestjs/common';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';

@Controller('warehouses')
@UseGuards(SessionGuard, PermissionGuard)
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  @Post()
  @Permissions(EntityType.WAREHOUSE, ActionType.CREATE)
  async create(@Body() dto: CreateWarehouseDto) {
    const warehouse = await this.warehouseService.create(dto);
    return APIResponse.success(
      { warehouse },
      'Warehouse created successfully',
      HttpStatus.CREATED,
    );
  }

  @Get()
  @Permissions(EntityType.WAREHOUSE, ActionType.READ)
  async findAll(@Query() query: Record<string, any>) {
    const { data, total, page, limit, hasNext, hasPrev } =
      await this.warehouseService.findAll(query);
    return APIResponse.success(
      { warehouses: data, total, page, limit, hasNext, hasPrev },
      'Warehouses retrieved successfully',
    );
  }

  @Get(':id')
  @Permissions(EntityType.WAREHOUSE, ActionType.READ)
  async findOne(@Param('id') id: string) {
    const warehouse = await this.warehouseService.findOne(id);
    return APIResponse.success(
      { warehouse },
      'Warehouse retrieved successfully',
    );
  }

  @Put(':id')
  @Permissions(EntityType.WAREHOUSE, ActionType.UPDATE)
  async update(@Param('id') id: string, @Body() dto: UpdateWarehouseDto) {
    const warehouse = await this.warehouseService.update(id, dto);
    return APIResponse.success({ warehouse }, 'Warehouse updated successfully');
  }

  @Delete(':id')
  @Permissions(EntityType.WAREHOUSE, ActionType.DELETE)
  async delete(@Param('id') id: string) {
    await this.warehouseService.delete(id);
    return APIResponse.success(
      null,
      'Warehouse deleted successfully',
      HttpStatus.NO_CONTENT,
    );
  }

  @Get(':id/orders')
  @Permissions(EntityType.WAREHOUSE, ActionType.READ)
  async getOrders(@Param('id') id: string) {
    const orders = await this.warehouseService.getWarehouseOrders(id);
    return APIResponse.success(
      { orders },
      'Warehouse orders retrieved successfully',
    );
  }

  @Get(':id/users')
  @Permissions(EntityType.WAREHOUSE, ActionType.READ)
  async getWarehouseUsers(@Param('id') id: string) {
    const users = await this.warehouseService.getWarehouseUsers(id);
    return APIResponse.success(
      { users },
      'Warehouse users retrieved successfully',
    );
  }
}
