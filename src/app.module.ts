import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  ThrottlerModule,
  ThrottlerModuleOptions,
  ThrottlerGuard,
  seconds,
} from '@nestjs/throttler';
import { RedisThrottlerStorage } from '@nestjs-redis/throttler-storage';

import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/users/users.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { RolesModule } from './modules/role/roles.module';
import { OrderModule } from './modules/order/order.module';
import { PickUpModule } from './modules/pickup/pickup.module';
import { RequestModule } from './modules/request/request.module';
import validationSchema from './config/env.validation';
import { DbModule } from './db/db.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { BranchModule } from './modules/branch/branch.module';
import { CsrfMiddleware } from './common/middleware/csrf.middleware';
import { RedisService } from './db/redis/redis.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema,
    }),

    ThrottlerModule.forRootAsync({
      imports: [DbModule],
      inject: [ConfigService, RedisService],
      useFactory: async (
        config: ConfigService,
        redisService: RedisService,
      ): Promise<ThrottlerModuleOptions> => ({
        throttlers: [
          {
            limit: config.get<number>('THROTTLE_LIMIT', 100),
            ttl: seconds(config.get<number>('THROTTLE_TTL', 60)),
          },
        ],
        storage: new RedisThrottlerStorage(redisService.getConnection() as any),
      }),
    }),

    AuthModule,
    UserModule,
    TenantModule,
    RolesModule,
    OrderModule,
    PickUpModule,
    RequestModule,
    BranchModule,
    DbModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CsrfMiddleware).forRoutes('auth');
  }
}

// .forRoutes('auth', 'orders');
