import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../factory/base.repository';
import { PrismaService } from 'src/db/prisma/prisma.service';
import { Address } from '@prisma/client';

@Injectable()
export class AddressRepository extends BaseRepository<Address> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma, 'address', ['label', 'city', 'country']);
  }
}
