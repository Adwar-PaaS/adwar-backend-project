import { Module } from '@nestjs/common';
import { PickUpController } from './pickup.controller';
import { PickUpService } from './pickup.service';
import { PickUpRepository } from './pickup.repository';
import { NotificationModule } from 'src/shared/notification/notification.module';
import { OrderModule } from '../order/order.module';
import { AddressModule } from 'src/shared/address/address.module';

@Module({
  imports: [NotificationModule, OrderModule, AddressModule],
  controllers: [PickUpController],
  providers: [PickUpService, PickUpRepository],
  exports: [PickUpService, PickUpRepository],
})
export class PickUpModule {}
