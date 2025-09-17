import { Module } from '@nestjs/common';
import { CustomerController } from './customer.controller';
import { OrderModule } from '../order/order.module';

@Module({
  imports: [OrderModule],
  controllers: [CustomerController],
})
export class CustomerModule {}
