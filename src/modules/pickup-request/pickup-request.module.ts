import { Module } from '@nestjs/common';
import { PickupRequestController } from './pickup-request.controller';
import { PickupRequestService } from './pickup-request.service';
import { PickupRequestRepository } from './pickup-request.repository';

@Module({
  controllers: [PickupRequestController],
  providers: [PickupRequestService, PickupRequestRepository],
  exports: [PickupRequestService, PickupRequestRepository],
})
export class PickupRequestModule {}
