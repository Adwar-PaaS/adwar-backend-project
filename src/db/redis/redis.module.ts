import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { DATABASE_TOKEN } from '../constants/db-token.constant';

@Global()
@Module({
  providers: [
    RedisService,
    {
      provide: DATABASE_TOKEN.REDIS,
      useExisting: RedisService,
    },
  ],
  exports: [RedisService, DATABASE_TOKEN.REDIS],
})
export class RedisModule {}
