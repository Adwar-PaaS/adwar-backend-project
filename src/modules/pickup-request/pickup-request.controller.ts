import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Patch,
} from '@nestjs/common';
import { PickupRequestService } from './pickup-request.service';
import { CreatePickupRequestDto } from './dto/create-pickup-request.dto';
import { SessionGuard } from '../auth/guards/session.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { UpdatePickupRequestStatusDto } from './dto/update-pickup-request-status.dto';

@Controller('pickup-requests')
@UseGuards(SessionGuard)
export class PickupRequestController {
  constructor(private readonly service: PickupRequestService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePickupRequestDto) {
    return this.service.create(user.id, dto);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.service.findAll(user);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.findOne(user, id);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePickupRequestStatusDto,
  ) {
    return this.service.updateStatus(id, dto.status);
  }
}
