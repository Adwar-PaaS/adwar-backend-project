import {
  Body,
  Controller,
  Param,
  Post,
  Get,
  HttpStatus,
  UseGuards,
  Delete,
  Patch,
  Put,
  Req,
} from '@nestjs/common';
import { PickUpService } from './pickup.service';
import { CreatePickupDto } from './dto/create-pickup.dto';
import { APIResponse } from '../../common/utils/api-response.util';
import { SessionGuard } from '../auth/guards/session.guard';
import { UpdatePickupAndOrdersStatusDto } from './dto/update-pickup-and-orders-status.dto';
import { UpdatePickupDto } from './dto/update-pickup.dto';
import { IOrder } from '../order/interfaces/order.interface';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';

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

  @Get(':id/orders')
  async getPickupOrders(
    @Param('id') id: string,
  ): Promise<APIResponse<{ orders: IOrder[] }>> {
    const orders = await this.pickupService.getPickupOrders(id);
    return APIResponse.success(
      { orders },
      'Pickup orders retrieved successfully',
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

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdatePickupDto) {
    const pickup = await this.pickupService.updatePickup(id, dto);
    return APIResponse.success(
      { pickup },
      'Pickup updated successfully',
      HttpStatus.OK,
    );
  }

  @Patch(':id/request')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdatePickupAndOrdersStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    const pickup = await this.pickupService.updatePickupStatusAndOrders(
      id,
      dto,
      user,
    );
    return APIResponse.success(
      { pickup },
      'Pickup request sent successfully',
      HttpStatus.OK,
    );
  }

  @Patch(':id/respond')
  async opsRespond(
    @Param('id') id: string,
    @Body() dto: UpdatePickupAndOrdersStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    const pickup = await this.pickupService.opsRespondOnPickupRequest(
      id,
      dto,
      user,
    );
    return APIResponse.success(
      { pickup },
      'Pickup request sent successfully',
      HttpStatus.OK,
    );
  }

  @Get()
  async findAll(@Req() req: any) {
    const pickups = await this.pickupService.findAll(req.query);
    return APIResponse.success(
      pickups,
      'Pickups retrieved successfully',
      HttpStatus.OK,
    );
  }

  @Get('notifications/ops')
  async getPickupNotificationsForOPS(@CurrentUser() user: AuthUser) {
    const notifications =
      await this.pickupService.getPickupNotificationsForOPS(user);
    return APIResponse.success(
      { notifications },
      'Pickup notifications for OPS retrieved successfully',
      HttpStatus.OK,
    );
  }
}
