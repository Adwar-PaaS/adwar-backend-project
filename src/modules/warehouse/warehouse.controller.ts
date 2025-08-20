import {
  Controller,
  Get,
  Post,
  Patch,
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

@Controller('warehouses')
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  @Post()
  @Permissions(EntityType.WAREHOUSE, ActionType.CREATE)
  async create(@Body() dto: any) {
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

  @Patch(':id')
  @Permissions(EntityType.WAREHOUSE, ActionType.UPDATE)
  async update(@Param('id') id: string, @Body() dto: any) {
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

  @Post('assign-user')
  @Permissions(EntityType.WAREHOUSE, ActionType.UPDATE)
  async assignUser(
    @Body() body: { userTenantId: string; warehouseId: string },
  ) {
    const userTenant = await this.warehouseService.assignUserToWarehouse(
      body.userTenantId,
      body.warehouseId,
    );
    return APIResponse.success(
      { userTenant },
      'User assigned to warehouse successfully',
    );
  }
}
