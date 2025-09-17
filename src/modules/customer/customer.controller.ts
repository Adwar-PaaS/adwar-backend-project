import { Controller, Get, UseGuards, Param, Query } from '@nestjs/common';
import { APIResponse } from '../../common/utils/api-response.util';
import { SessionGuard } from '../auth/guards/session.guard';
import { OrderService } from '../order/order.service';
import { PickUpService } from '../pickup/pickup.service';
import { IOrder } from '../order/interfaces/order.interface';
import { PaginationResult } from '../../common/utils/api-features.util';
import { PickUp } from '@prisma/client';

@Controller('customers')
@UseGuards(SessionGuard)
export class CustomerController {
  constructor(
    private readonly orderService: OrderService,
    private readonly pickupService: PickUpService,
  ) {}

  @Get(':customerId/orders')
  async getOrdersOfCustomer(
    @Query() query: Record<string, any>,
    @Param('customerId') customerId: string,
  ): Promise<APIResponse<{ orders: IOrder[] } & Partial<PaginationResult>>> {
    const { items, ...pagination } = await this.orderService.getCustomerOrders(
      customerId,
      query,
    );

    return APIResponse.success(
      { orders: items, ...pagination },
      'Customer orders retrieved successfully',
    );
  }

  @Get(':customerId/pickups')
  async getPickupsOfCustomer(
    @Query() query: Record<string, any>,
    @Param('customerId') customerId: string,
  ): Promise<APIResponse<{ pickups: PickUp[] } & Partial<PaginationResult>>> {
    const { items, ...pagination } =
      await this.pickupService.getPickupsOfCustomer(customerId, query);

    return APIResponse.success(
      { pickups: items, ...pagination },
      'Customer pickups retrieved successfully',
    );
  }
}
