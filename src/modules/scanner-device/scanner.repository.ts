import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../shared/factory/base.repository';
import { PrismaService } from 'src/db/prisma/prisma.service';
import { Prisma, ScannerDevice } from '@prisma/client';
import { RedisService } from 'src/db/redis/redis.service';

export type SafeScanner = ScannerDevice;

@Injectable()
export class ScannerRepository extends BaseRepository<
  ScannerDevice,
  SafeScanner,
  Prisma.ScannerDeviceDelegate
> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly redis: RedisService,
  ) {
    super(prisma, prisma.scannerDevice, ['deviceId'], {
      include: { branch: true },
    });
  }
}
