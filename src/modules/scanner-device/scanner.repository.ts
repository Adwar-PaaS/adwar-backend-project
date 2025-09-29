import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../shared/factory/base.repository';
import { PrismaService } from 'src/db/prisma/prisma.service';
import { ScannerDevice } from '@prisma/client';
import { RedisService } from 'src/db/redis/redis.service';

@Injectable()
export class ScannerRepository extends BaseRepository<ScannerDevice> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly redis: RedisService,
  ) {
    super(prisma, 'scannerDevice', ['deviceId'], {
      include: { branch: true },
    });
  }
}
