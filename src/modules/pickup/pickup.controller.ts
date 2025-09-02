import { Body, Controller, Param, Post, Get } from '@nestjs/common';
import { PickUpService } from './pickup.service';
import { CreatePickupDto } from './dto/create-pickup.dto';
import { AddOrderDto } from './dto/add-order.dto';
import { RespondRequestDto } from './dto/respond-request.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { RemoveOrderDto } from './dto/remove-order.dto';

@Controller('pickups')
export class PickUpController {
  constructor(private readonly pickupService: PickUpService) {}

  @Post()
  async create(@Body() dto: CreatePickupDto) {
    return this.pickupService.createPickup(dto.orderIds);
  }

  @Post(':id/add-orders')
  async addOrder(@Param('id') id: string, @Body() dto: AddOrderDto) {
    return this.pickupService.addOrder(id, dto.orderId);
  }

  @Post(':id/remove-orders')
  async removeOrder(@Param('id') id: string, @Body() dto: RemoveOrderDto) {
    return this.pickupService.removeOrder(id, dto.orderId);
  }

  @Post(':id/requests')
  async requestApproval(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.pickupService.requestApproval(id, user.id);
  }

  @Get(':id/pickup-orders')
  async getPickupOrdersOfCustomer(@Param('id') id: string) {
    return this.pickupService.getPickupOrders(id);
  }

  @Get(':id/pickup-requests')
  async getPickupRequestsOfCustomer(@Param('id') id: string) {
    return this.pickupService.getPickupRequests(id);
  }

  @Post('requests/:requestId/respond')
  async respond(
    @Param('requestId') requestId: string,
    @Body() dto: RespondRequestDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.pickupService.respondToRequest(requestId, user.id, dto.status);
  }
}
