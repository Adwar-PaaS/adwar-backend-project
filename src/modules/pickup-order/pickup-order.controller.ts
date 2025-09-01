import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { PickupOrderService } from './pickup-order.service';
import { CreatePickupOrderDto } from './dto/create-pickup-order.dto';
import { UpdatePickupOrderDto } from './dto/update-pickup-order.dto';

@Controller('pickup-orders')
export class PickupOrderController {
  constructor(private readonly service: PickupOrderService) {}

  @Post()
  create(@Body() dto: CreatePickupOrderDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePickupOrderDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
