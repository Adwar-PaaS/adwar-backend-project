import { Global, Module, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { DatabaseFactoryService } from './services/db-factory.service';
import { DatabaseManagerService } from './services/db-manager.service';

@Global()
@Module({
  imports: [PrismaModule, RedisModule],
  providers: [DatabaseFactoryService, DatabaseManagerService],
  exports: [DatabaseManagerService],
})
export class DbModule implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly dbManager: DatabaseManagerService) {}

  async onModuleInit() {
    await this.dbManager.connectAll();
  }

  async onModuleDestroy() {
    await this.dbManager.disconnectAll();
  }
}
