import { Module } from '@nestjs/common';
import { ShipmentController } from './shipment.controller';
import { ShipmentService } from './shipment.service';
import { ShipmentRepository } from './shipment.repository';

@Module({
  imports: [],
  controllers: [ShipmentController],
  providers: [ShipmentService, ShipmentRepository],
  exports: [ShipmentService],
})
export class ShipmentModule {}
