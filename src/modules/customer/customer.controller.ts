import {
  Controller,
  Get,
  UseGuards,
  Param,
  Query,
  HttpStatus,
} from '@nestjs/common';
import { APIResponse } from '../../common/utils/api-response.util';
import { SessionGuard } from '../auth/guards/session.guard';
import { OrderService } from '../order/order.service';
import { PickUpService } from '../pickup/pickup.service';
import { PaginationResult } from '../../common/utils/api-features.util';
import { Order, PickUp } from '@prisma/client';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';

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
  ): Promise<APIResponse<{ orders: Order[] } & Partial<PaginationResult>>> {
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

  @Get('pickup/notifications')
  async getPickupNotificationsForOPS(@CurrentUser() user: AuthUser) {
    const notifications =
      await this.pickupService.getCustomerPickupNotifications(user);
    return APIResponse.success(
      { notifications },
      'Customer pickup notifications retrieved successfully',
      HttpStatus.OK,
    );
  }
}
