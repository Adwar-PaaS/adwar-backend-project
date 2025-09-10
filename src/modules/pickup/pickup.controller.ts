import {
  Body,
  Controller,
  Param,
  Post,
  Get,
  HttpStatus,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { PickUpService } from './pickup.service';
import { CreatePickupDto } from './dto/create-pickup.dto';
import { AddOrderDto } from './dto/add-order.dto';
import { RespondRequestDto } from './dto/respond-request.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { RemoveOrderDto } from './dto/remove-order.dto';
import { APIResponse } from '../../common/utils/api-response.util';
import { SessionGuard } from '../auth/guards/session.guard';

@Controller('pickups')
@UseGuards(SessionGuard)
export class PickUpController {
  constructor(private readonly pickupService: PickUpService) {}

  @Post()
  async create(@Body() dto: CreatePickupDto) {
    const pickup = await this.pickupService.createPickup(dto);
    return APIResponse.success(
      { pickup },
      'Pickup created successfully',
      HttpStatus.CREATED,
    );
  }

  @Post(':id/add-orders')
  async addOrder(@Param('id') id: string, @Body() dto: AddOrderDto) {
    const pickup = await this.pickupService.addOrder(id, dto.orderId);
    return APIResponse.success(
      { pickup },
      'Order added to pickup successfully',
      HttpStatus.OK,
    );
  }

  @Post(':id/remove-orders')
  async removeOrder(@Param('id') id: string, @Body() dto: RemoveOrderDto) {
    const pickup = await this.pickupService.removeOrder(id, dto.orderId);
    return APIResponse.success(
      { pickup },
      'Order removed from pickup successfully',
      HttpStatus.OK,
    );
  }

  @Get('get-all-requests')
  async findAllRequests() {
    const requests = await this.pickupService.findAllRequests();
    return APIResponse.success(
      { requests },
      'Requests retrieved successfully',
      HttpStatus.OK,
    );
  }

  @Post(':id/requests')
  async requestApproval(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ) {
    const request = await this.pickupService.requestApproval(id, user.id);
    return APIResponse.success(
      { request },
      'Pickup request submitted successfully',
      HttpStatus.CREATED,
    );
  }

  @Get(':id/pickup-orders')
  async getPickupOrdersOfCustomer(@Param('id') id: string) {
    const orders = await this.pickupService.getPickupOrders(id);
    return APIResponse.success(
      { orders },
      'Pickup orders retrieved successfully',
      HttpStatus.OK,
    );
  }

  @Get(':customerId/customer-pickups')
  async getAllPickupOrdersForCustomer(@Param('customerId') customerId: string) {
    const pickups =
      await this.pickupService.getAllPickupOrdersForCustomer(customerId);
    return APIResponse.success(
      { pickups },
      'Customer Pickup orders retrieved successfully',
      HttpStatus.OK,
    );
  }

  @Get(':customerId/customer-pickup-requests')
  async getAllPickupRequestsForCustomer(
    @Param('customerId') customerId: string,
  ) {
    const requests =
      await this.pickupService.getAllPickupRequestsForCustomer(customerId);
    return APIResponse.success(
      { requests },
      'Customer Pickup requests retrieved successfully',
      HttpStatus.OK,
    );
  }

  @Get(':id/pickup-requests')
  async getPickupRequestsOfCustomer(@Param('id') id: string) {
    const requests = await this.pickupService.getPickupRequests(id);
    return APIResponse.success(
      { requests },
      'Pickup requests retrieved successfully',
      HttpStatus.OK,
    );
  }

  @Post('requests/:requestId/respond')
  async respond(
    @Param('requestId') requestId: string,
    @Body() dto: RespondRequestDto,
    @CurrentUser() user: AuthUser,
  ) {
    const response = await this.pickupService.respondToRequest(
      requestId,
      user.id,
      dto.status,
    );

    return APIResponse.success(
      { response },
      'Pickup request response submitted successfully',
      HttpStatus.OK,
    );
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.pickupService.deletePickup(id);
    return APIResponse.success(
      null,
      'Pickup deleted successfully',
      HttpStatus.OK,
    );
  }
}
