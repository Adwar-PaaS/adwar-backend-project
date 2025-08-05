import { Module, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { DatabaseFactoryService } from './services/db-factory.service';
import { DatabaseManagerService } from './services/db-manager.service';
import { DatabaseType } from './constants/db-type.enum';

@Module({
  imports: [PrismaModule, RedisModule],
  providers: [DatabaseFactoryService, DatabaseManagerService],
  exports: [DatabaseManagerService],
})
export class DatabaseModule implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly dbManager: DatabaseManagerService) {}

  async onModuleInit() {
    const types = [DatabaseType.PRISMA, DatabaseType.REDIS];
    for (const type of types) {
      this.dbManager.register(type);
    }

    await this.dbManager.connectAll();
  }

  async onModuleDestroy() {
    await this.dbManager.disconnectAll();
  }
}
