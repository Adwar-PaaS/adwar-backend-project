// import { Injectable } from '@nestjs/common';
// import { PrismaService } from '../../db/prisma/prisma.service';
// import { Notification, NotificationChannel } from '@prisma/client';
// import { CreateNotificationDto } from './dto/create-notification.dto';
// import { WebsocketService } from '../../shared/websocket/websocket.service';

// type DeliverOptions = {
//   emitSocket?: boolean;
// };

// @Injectable()
// export class NotificationService {
//   constructor(
//     private readonly prisma: PrismaService,
//     private readonly ws: WebsocketService,
//   ) {}

//   async create(dto: CreateNotificationDto): Promise<Notification> {
//     const notification = await this.prisma.notification.create({
//       data: {
//         senderId: dto.senderId ?? null,
//         recipientId: dto.recipientId ?? null,
//         title: dto.title,
//         message: dto.message,
//         relatedId: dto.relatedId ?? null,
//         relatedType: dto.relatedType ?? null,
//         category: dto.category ?? 'INFO',
//         channels: dto.channels && dto.channels.length ? dto.channels : ['IN_APP'],
//         priority: dto.priority ?? 'MEDIUM',
//         broadcast: dto.broadcast ?? false,
//       },
//     });

//     await this.deliver(notification, { emitSocket: true });
//     return notification;
//   }

//   async markRead(id: string): Promise<Notification> {
//     return this.prisma.notification.update({
//       where: { id },
//       data: { isRead: true },
//     });
//   }

//   async listForUser(userId: string) {
//     return this.prisma.notification.findMany({
//       where: { recipientId: userId },
//       orderBy: { createdAt: 'desc' },
//       take: 100,
//     });
//   }

//   async deliver(notification: Notification, options: DeliverOptions = {}) {
//     const channels = notification.channels as NotificationChannel[];

//     if (notification.broadcast || !notification.recipientId) {
//       if (options.emitSocket !== false) {
//         this.ws.emitToAll('notification', notification);
//       }
//     } else {
//       if (options.emitSocket !== false) {
//         this.ws.emitToUser(notification.recipientId, 'notification', notification);
//       }
//     }
//     // TODO: enqueue email/SMS/push via workers if channels include them
//   }
// }
