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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
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
