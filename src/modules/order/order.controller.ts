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
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { PaginationResult } from '../../common/utils/api-features.util';
import { CsrfExempt } from '../../common/decorators/csrf-exempt.decorator';
import { ScanUpdateStatusDto } from './dto/scan-update-status.dto';
import { ScanCreateOrderDto } from './dto/scan-create-order.dto';
import { IOrder } from './interfaces/order.interface';

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
  // @Permissions(EntityType.ORDER, ActionType.CREATE)
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateOrderDto) {
    const order = await this.orderService.create(user, dto);

    return APIResponse.success(
      { order },
      'Order created successfully',
      HttpStatus.CREATED,
    );
  }

  @Get()
  @Permissions(EntityType.ORDER, ActionType.READ)
  @Get()
  async findAll(
    @Query() query: Record<string, any>,
  ): Promise<APIResponse<{ orders: IOrder[] } & Partial<PaginationResult>>> {
    const { items, ...pagination } = await this.orderService.findAll(query);
    return APIResponse.success(
      { orders: items, ...pagination },
      'Orders retrieved successfully',
    );
  }

  @Get(':id')
  @Permissions(EntityType.ORDER, ActionType.READ)
  async findOne(@Param('id') id: string) {
    const order = await this.orderService.findOne(id);
    return APIResponse.success({ order }, 'Order retrieved successfully');
  }

  // @Get('customer/:customerId')
  // @Permissions(EntityType.ORDER, ActionType.READ)
  // async getOrdersOfCustomer(@Param('customerId') customerId: string) {
  //   const orders = await this.orderService.getCustomerOrders(customerId);
  //   return APIResponse.success(
  //     { orders },
  //     'Customer orders retrieved successfully',
  //   );
  // }

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

  @Get('scan/sku/:sku')
  @Permissions(EntityType.ORDER, ActionType.READ)
  async findBySku(@Param('sku') sku: string) {
    const order = await this.orderService.findOneBySku(sku);
    return APIResponse.success({ order }, 'Order retrieved by SKU');
  }

  // Public/CSRF-exempt webhook endpoints for scanners/integrations
  @Post('scan/update-status')
  @CsrfExempt()
  async scanUpdateStatus(
    @Body() dto: ScanUpdateStatusDto,
    @Param() _p: any,
    @Query() _q: any,
    req?: any,
  ) {
    const signature = req?.headers['x-webhook-signature'] as string | undefined;
    const order = await this.orderService.scanUpdateStatus(
      dto,
      signature,
      req?.rawBody,
    );
    return APIResponse.success({ order }, 'Order status updated via scan');
  }

  @Post('scan/create')
  @CsrfExempt()
  async scanCreateOrder(
    @Body() dto: ScanCreateOrderDto,
    @Param() _p: any,
    @Query() _q: any,
    req?: any,
  ) {
    const signature = req?.headers['x-webhook-signature'] as string | undefined;
    const order = await this.orderService.scanCreateOrder(
      dto,
      signature,
      req?.rawBody,
    );
    return APIResponse.success(
      { order },
      'Order created via scan',
      HttpStatus.CREATED,
    );
  }
}
