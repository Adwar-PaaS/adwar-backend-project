import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../shared/factory/base.repository';
import { PrismaService } from 'src/db/prisma/prisma.service';
import { RedisService } from 'src/db/redis/redis.service';
import { IBranch } from './interfaces/branch.interface';
import { Branch } from '@prisma/client';
import { branchSelector } from '../../common/selectors/branch.selector';

@Injectable()
export class BranchRepository extends BaseRepository<Branch> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly redis: RedisService,
  ) {
    super(prisma, 'branch', ['code', 'name'], branchSelector);
  }
}
