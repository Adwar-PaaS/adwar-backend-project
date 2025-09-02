import { Body, Controller, Param, Post } from '@nestjs/common';
import { PickUpService } from './pickup.service';
import { CreatePickupDto } from './dto/create-pickup.dto';
import { AddOrderDto } from './dto/add-order.dto';
import { RespondRequestDto } from './dto/respond-request.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';

@Controller('pickups')
export class PickUpController {
  constructor(private readonly pickupService: PickUpService) {}

  @Post()
  async create(@Body() dto: CreatePickupDto) {
    return this.pickupService.createPickup(dto.orderIds);
  }

  @Post(':id/orders')
  async addOrder(@Param('id') id: string, @Body() dto: AddOrderDto) {
    return this.pickupService.addOrder(id, dto.orderId);
  }

  @Post(':id/requests')
  async requestApproval(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.pickupService.requestApproval(id, user.id);
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
