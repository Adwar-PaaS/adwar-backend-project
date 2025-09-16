import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ShipmentService } from './shipment.service';
import { APIResponse } from '../../common/utils/api-response.util';
import { PaginationResult } from '../../common/utils/api-features.util';
import { SessionGuard } from '../auth/guards/session.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { Permissions } from '../../common/decorators/permission.decorator';
import { EntityType, ActionType } from '@prisma/client';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';
// import { UpdateShipmentStatusDto } from './dto/update-shipment-status.dto';

@Controller('shipments')
@UseGuards(SessionGuard, PermissionGuard)
export class ShipmentController {
  constructor(private readonly service: ShipmentService) {}

  @Post()
  @Permissions(EntityType.SHIPMENT, ActionType.CREATE)
  async create(@Body() dto: CreateShipmentDto) {
    const shipment = await this.service.create(dto);
    return APIResponse.success(
      { shipment },
      'Shipment created successfully',
      HttpStatus.CREATED,
    );
  }

  @Get()
  @Permissions(EntityType.SHIPMENT, ActionType.READ)
  async findAll(
    @Query() query: Record<string, any>,
  ): Promise<APIResponse<{ shipments: any[] } & Partial<PaginationResult>>> {
    const { items, ...pagination } = await this.service.findAll(query);
    return APIResponse.success(
      { shipments: items, ...pagination },
      'Shipments retrieved successfully',
    );
  }

  @Get(':id')
  @Permissions(EntityType.SHIPMENT, ActionType.READ)
  async findOne(@Param('id') id: string) {
    const shipment = await this.service.findOne(id);
    return APIResponse.success({ shipment }, 'Shipment retrieved successfully');
  }

  @Put(':id')
  @Permissions(EntityType.SHIPMENT, ActionType.UPDATE)
  async update(@Param('id') id: string, @Body() dto: UpdateShipmentDto) {
    const shipment = await this.service.update(id, dto);
    return APIResponse.success({ shipment }, 'Shipment updated successfully');
  }

  @Delete(':id')
  @Permissions(EntityType.SHIPMENT, ActionType.DELETE)
  async delete(@Param('id') id: string) {
    await this.service.delete(id);
    return APIResponse.success(null, 'Shipment deleted', HttpStatus.NO_CONTENT);
  }
}
