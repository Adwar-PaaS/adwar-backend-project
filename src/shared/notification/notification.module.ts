import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { PrismaService } from '../../db/prisma/prisma.service';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [WebsocketModule],
  providers: [NotificationService, PrismaService],
  exports: [NotificationService],
})
export class NotificationModule {}
