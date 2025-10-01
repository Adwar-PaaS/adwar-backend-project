import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../shared/factory/base.repository';
import { PrismaService } from 'src/db/prisma/prisma.service';
import { RedisService } from 'src/db/redis/redis.service';
import { Branch, Prisma } from '@prisma/client';
import { branchSelector } from '../../common/selectors/branch.selector';

export type SafeBranch = Branch;

@Injectable()
export class BranchRepository extends BaseRepository<
  Branch,
  SafeBranch,
  Prisma.BranchDelegate
> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly redis: RedisService,
  ) {
    super(prisma, prisma.branch, ['code', 'name'], branchSelector);
  }
}
