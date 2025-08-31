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
  UseGuards,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { APIResponse } from '../../common/utils/api-response.util';
import { Permissions } from '../../common/decorators/permission.decorator';
import { EntityType, ActionType } from '@prisma/client';
import { SessionGuard } from '../../modules/auth/guards/session.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { Audit } from '../../common/decorators/audit.decorator';

@Controller('orders')
@UseGuards(SessionGuard, PermissionGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post()
  @Audit({
    entityType: EntityType.ORDER,
    actionType: ActionType.CREATE,
    description: 'Created a new order',
  })
  @Permissions(EntityType.ORDER, ActionType.CREATE)
  async create(@Body() dto: CreateOrderDto) {
    const order = await this.orderService.create(dto);
    return APIResponse.success(
      { order },
      'Order created successfully',
      HttpStatus.CREATED,
    );
  }

  @Get()
  @Permissions(EntityType.ORDER, ActionType.READ)
  async findAll(@Query() query: Record<string, any>) {
    const { data, total, page, limit, hasNext, hasPrev } =
      await this.orderService.findAll(query);
    return APIResponse.success(
      { orders: data, total, page, limit, hasNext, hasPrev },
      'Orders retrieved successfully',
    );
  }

  @Get(':id')
  @Permissions(EntityType.ORDER, ActionType.READ)
  async findOne(@Param('id') id: string) {
    const order = await this.orderService.findOne(id);
    return APIResponse.success({ order }, 'Order retrieved successfully');
  }

  @Get('driver/:driverId')
  @Permissions(EntityType.ORDER, ActionType.READ)
  async getOrdersOfDriver(@Param('driverId') driverId: string) {
    const orders = await this.orderService.getOrdersOfDriver(driverId);
    return APIResponse.success(
      { orders },
      'Driver orders retrieved successfully',
    );
  }

  @Get('customer/:customerId')
  @Permissions(EntityType.ORDER, ActionType.READ)
  async getOrdersOfCustomer(@Param('customerId') customerId: string) {
    const orders = await this.orderService.getOrdersOfCustomer(customerId);
    return APIResponse.success(
      { orders },
      'Driver orders retrieved successfully',
    );
  }

  @Put(':id/status')
  @Permissions(EntityType.ORDER, ActionType.UPDATE)
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    const order = await this.orderService.updateStatus(id, dto);
    return APIResponse.success({ order }, 'Order status updated successfully');
  }

  @Put(':id')
  @Audit({
    entityType: EntityType.ORDER,
    actionType: ActionType.UPDATE,
    entityIdParam: 'id',
    description: 'Updated order status',
  })
  @Permissions(EntityType.ORDER, ActionType.UPDATE)
  async update(@Param('id') id: string, @Body() dto: UpdateOrderDto) {
    const order = await this.orderService.update(id, dto);
    return APIResponse.success({ order }, 'Order updated successfully');
  }

  @Delete(':id')
  @Permissions(EntityType.ORDER, ActionType.DELETE)
  async delete(@Param('id') id: string) {
    await this.orderService.delete(id);
    return APIResponse.success(
      null,
      'Order deleted successfully',
      HttpStatus.NO_CONTENT,
    );
  }
}
