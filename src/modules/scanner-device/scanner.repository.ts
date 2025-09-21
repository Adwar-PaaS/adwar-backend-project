import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../shared/factory/base.repository';
import { PrismaService } from 'src/db/prisma/prisma.service';
import { ScannerDevice } from '@prisma/client';

@Injectable()
export class ScannerRepository extends BaseRepository<ScannerDevice> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma, 'scannerDevice', ['deviceId'], {
      include: { branch: true },
    });
  }
}
