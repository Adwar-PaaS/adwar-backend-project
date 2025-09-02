import { Module } from '@nestjs/common';
import { PickUpController } from './pickup.controller';
import { PickUpService } from './pickup.service';
import { PickUpRepository } from './repositories/pickup.repository';
import { PickUpOrderRepository } from './repositories/pickup-order.repository';
import { PickUpRequestRepository } from './repositories/pickup-request.repository';

@Module({
  controllers: [PickUpController],
  providers: [
    PickUpService,
    PickUpRepository,
    PickUpOrderRepository,
    PickUpRequestRepository,
  ],
})
export class PickUpModule {}
