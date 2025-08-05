import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { DATABASE_TOKEN } from '../constants/db-token.constant';

@Global()
@Module({
  providers: [
    PrismaService,
    {
      provide: DATABASE_TOKEN.PRISMA,
      useExisting: PrismaService,
    },
  ],
  exports: [PrismaService, DATABASE_TOKEN.PRISMA],
})
export class PrismaModule {}
