import { Module } from '@nestjs/common';
import { WarehouseController } from './warehouse.controller';
import { WarehouseService } from './warehouse.service';
import { WarehouseRepository } from './warehouse.repository';
import { PrismaClient } from '@prisma/client';

@Module({
  controllers: [WarehouseController],
  providers: [WarehouseService, WarehouseRepository, PrismaClient],
  exports: [WarehouseService],
})
export class WarehouseModule {}
