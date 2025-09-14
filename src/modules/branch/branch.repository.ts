import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../shared/factory/base.repository';
import { PrismaService } from 'src/db/prisma/prisma.service';

@Injectable()
export class BranchRepository extends BaseRepository<any> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma, prisma.branch, ['code', 'name']);
  }
}

// import { Injectable } from '@nestjs/common';
// import { BaseRepository } from '../../shared/factory/base.repository';
// import { PrismaService } from 'src/db/prisma/prisma.service';

// @Injectable()
// export class BranchRepository extends BaseRepository<any> {
//   constructor(protected readonly prisma: PrismaService) {
//     super(prisma, prisma.branch, ['name'], {
//       address: true,
//       tenant: true,
//       customer: true,
//     });
//   }
// }
