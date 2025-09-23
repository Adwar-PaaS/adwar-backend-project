import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../shared/factory/base.repository';
import { PrismaService } from 'src/db/prisma/prisma.service';
import { IShipment } from './interfaces/shipment.interface';
import { RedisService } from 'src/db/redis/redis.service';

@Injectable()
export class ShipmentRepository extends BaseRepository<IShipment> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly redis: RedisService,
  ) {
    super(prisma, redis, 'shipment', ['shipmentNumber'], {
      senderAddress: {
        select: { id: true, address1: true, city: true, country: true },
      },
      consigneeAddress: {
        select: { id: true, address1: true, city: true, country: true },
      },
    });
  }
}
