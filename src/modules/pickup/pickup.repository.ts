import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma/prisma.service';
import { BaseRepository } from 'src/shared/factory/base.repository';
import { PickUp } from '@prisma/client';

@Injectable()
export class PickUpRepository extends BaseRepository<PickUp> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma, 'pickUp', ['code'], {
      branch: true,
      driver: true,
    });
  }
}
