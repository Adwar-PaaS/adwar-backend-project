import { Module } from '@nestjs/common';
import { PickUpController } from './pickup.controller';
import { PickUpService } from './pickup.service';
import { PickUpRepository } from './pickup.repository';
import { NotificationModule } from 'src/shared/notification/notification.module';

@Module({
  imports: [NotificationModule],
  controllers: [PickUpController],
  providers: [PickUpService, PickUpRepository],
})
export class PickUpModule {}
