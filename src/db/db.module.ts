import { Global, Module, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { DatabaseFactoryService } from './services/db-factory.service';
import { DatabaseManagerService } from './services/db-manager.service';
import { DatabaseType } from './constants/db-type.enum';

@Global()
@Module({
  imports: [PrismaModule, RedisModule],
  providers: [PrismaService, DatabaseFactoryService, DatabaseManagerService],
  exports: [PrismaService, DatabaseManagerService],
})
export class DbModule implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly dbManager: DatabaseManagerService) {}

  async onModuleInit() {
    [DatabaseType.PRISMA, DatabaseType.REDIS].forEach((t) =>
      this.dbManager.register(t),
    );
    await this.dbManager.connectAll();
  }

  async onModuleDestroy() {
    await this.dbManager.disconnectAll();
  }
}
