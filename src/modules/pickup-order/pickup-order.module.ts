import { Module } from '@nestjs/common';
import { PickupOrderService } from './pickup-order.service';
import { PickupOrderController } from './pickup-order.controller';
import { PickupOrderRepository } from './pickup-order.repository';
import { PickupRequestModule } from '../pickup-request/pickup-request.module';

@Module({
  imports: [PickupRequestModule],
  controllers: [PickupOrderController],
  providers: [PickupOrderService, PickupOrderRepository],
  exports: [PickupOrderService, PickupOrderRepository],
})
export class PickupOrderModule {}
