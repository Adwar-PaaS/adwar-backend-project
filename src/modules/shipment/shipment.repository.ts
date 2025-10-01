import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../shared/factory/base.repository';
import { PrismaService } from 'src/db/prisma/prisma.service';
import { RedisService } from 'src/db/redis/redis.service';
import { Prisma, Shipment } from '@prisma/client';

export type SafeShipment = Shipment;

@Injectable()
export class ShipmentRepository extends BaseRepository<
  Shipment,
  SafeShipment,
  Prisma.ShipmentDelegate
> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly redis: RedisService,
  ) {
    super(prisma, prisma.shipment, ['shipmentNumber'], {
      senderAddress: {
        select: { id: true, address1: true, city: true, country: true },
      },
      consigneeAddress: {
        select: { id: true, address1: true, city: true, country: true },
      },
    });
  }
}
