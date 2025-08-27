import { Module } from '@nestjs/common';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { OrderRepository } from './order.repository';
import { PermissionModule } from '../../shared/permission/permission.module';
import { PrismaClient } from '@prisma/client';

@Module({
  imports: [PermissionModule],
  controllers: [OrderController],
  providers: [OrderService, OrderRepository, PrismaClient],
  exports: [OrderService],
})
export class OrderModule {}
