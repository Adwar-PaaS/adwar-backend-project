import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { RequestService } from './request.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestStatusDto } from './dto/update-request-status.dto';
import { SessionGuard } from '../auth/guards/session.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';

@Controller('requests')
@UseGuards(SessionGuard)
export class RequestController {
  constructor(private readonly service: RequestService) {}

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateRequestDto) {
    return this.service.create(user, dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateRequestStatusDto,
  ) {
    return this.service.updateStatus(user, id, dto);
  }
}
