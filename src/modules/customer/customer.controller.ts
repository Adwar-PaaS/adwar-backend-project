import { Controller, Get, UseGuards, Param } from '@nestjs/common';
import { APIResponse } from '../../common/utils/api-response.util';
import { SessionGuard } from '../auth/guards/session.guard';
import { OrderService } from '../order/order.service';

@Controller('customers')
@UseGuards(SessionGuard)
export class CustomerController {
  constructor(private readonly orderService: OrderService) {}

  @Get(':customerId/orders')
  async getOrdersOfCustomer(@Param('customerId') customerId: string) {
    const orders = await this.orderService.getCustomerOrders(customerId);
    return APIResponse.success(
      { orders },
      'Customer orders retrieved successfully',
    );
  }
}
