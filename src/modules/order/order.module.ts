import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { OrderRepository } from './order.repository';
import { PermissionModule } from '../../shared/permission/permission.module';
import { ScannerModule } from '../scanner-device/scanner.module';

@Module({
  imports: [PermissionModule, ScannerModule],
  controllers: [OrderController],
  providers: [OrderService, OrderRepository],
  exports: [OrderService, OrderRepository],
})
export class OrderModule {}
