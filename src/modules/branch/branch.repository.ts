import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../shared/factory/base.repository';
import { PrismaService } from 'src/db/prisma/prisma.service';

@Injectable()
export class BranchRepository extends BaseRepository<any> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma, prisma.branch, ['location', 'name']);
  }

  getCustomerBranches(customerId: string) {
    return this.prisma.branch.findMany({
      where: { customerId, deletedAt: null },
    });
  }
}
