import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../shared/factory/base.repository';
import { PrismaService } from 'src/db/prisma/prisma.service';
import { IBranch } from './interfaces/branch.interface';

@Injectable()
export class BranchRepository extends BaseRepository<IBranch> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma, 'branch', ['code', 'name'], {
      tenant: true,

      address: true,
    });
  }
}
