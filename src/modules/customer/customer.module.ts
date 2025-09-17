import { Module } from '@nestjs/common';
import { CustomerController } from './customer.controller';
import { OrderModule } from '../order/order.module';
import { PickUpModule } from '../pickup/pickup.module';

@Module({
  imports: [OrderModule, PickUpModule], 
  controllers: [CustomerController],
})
export class CustomerModule {}
