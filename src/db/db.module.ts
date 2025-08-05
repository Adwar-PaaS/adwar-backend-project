import { Module, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { MongoDatabaseModule } from './mongo/mongoose.module';
import { RedisModule } from './redis/redis.module';
import { DatabaseManagerService } from './database-manager.service';
import { PrismaService } from './prisma/prisma.service';
import { RedisService } from './redis/redis.service';

@Module({
  imports: [PrismaModule, MongoDatabaseModule, RedisModule],
  providers: [DatabaseManagerService],
  exports: [DatabaseManagerService],
})
export class DatabaseModule implements OnModuleInit, OnModuleDestroy {
  constructor(
    private dbManager: DatabaseManagerService,
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async onModuleInit() {
    this.dbManager.register(this.prisma);
    this.dbManager.register(this.redis);
    await this.dbManager.connectAll();
  }

  async onModuleDestroy() {
    await this.dbManager.disconnectAll();
  }
}
