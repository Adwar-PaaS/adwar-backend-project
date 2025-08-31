import { Module, Global } from '@nestjs/common';
import { WebsocketGateway } from './websocket.gateway';
import { WebsocketService } from './websocket.service';
import { PrismaService } from 'src/db/prisma/prisma.service';
import { RedisService } from 'src/db/redis/redis.service';

@Global()
@Module({
  providers: [WebsocketGateway, WebsocketService, PrismaService, RedisService],
  exports: [WebsocketService],
})
export class WebsocketModule {}
