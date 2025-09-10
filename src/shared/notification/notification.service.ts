import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../db/prisma/prisma.service';
import { Notification, NotificationChannel } from '@prisma/client';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { WebsocketService } from '../../shared/websocket/websocket.service';

type DeliverOptions = {
  emitSocket?: boolean;
};

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ws: WebsocketService,
  ) {}

  async create(dto: CreateNotificationDto): Promise<Notification> {
    const recipients = Array.isArray(dto.recipientIds)
      ? dto.recipientIds
      : dto.recipientIds
        ? [dto.recipientIds]
        : [];

    if (!recipients.length) {
      throw new Error('At least one recipient is required');
    }

    const notification = await this.prisma.notification.create({
      data: {
        senderId: dto.senderId ?? null,
        title: dto.title,
        message: dto.message,
        relatedId: dto.relatedId ?? null,
        relatedType: dto.relatedType ?? null,
        category: dto.category ?? 'INFO',
        channels: dto.channels?.length ? dto.channels : ['IN_APP'],
        priority: dto.priority ?? 'MEDIUM',
        scheduledFor: dto.scheduledFor ?? null,
        expiresAt: dto.expiresAt ?? null,
        recipients: {
          create: recipients.map((recipientId) => ({
            recipientId,
          })),
        },
      },
      include: { recipients: true },
    });

    await this.deliver(notification, { emitSocket: true });
    return notification;
  }

  async broadcastToAll(
    dto: Omit<CreateNotificationDto, 'recipientIds'>,
  ): Promise<Notification> {
    // Fetch all active users (adjust condition if you have status column)
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true },
    });

    if (!users.length) {
      throw new Error('No users found for broadcast');
    }

    const notification = await this.prisma.notification.create({
      data: {
        senderId: dto.senderId ?? null,
        title: dto.title,
        message: dto.message,
        relatedId: dto.relatedId ?? null,
        relatedType: dto.relatedType ?? null,
        category: dto.category ?? 'SYSTEM',
        channels: dto.channels?.length ? dto.channels : ['IN_APP'],
        priority: dto.priority ?? 'MEDIUM',
        scheduledFor: dto.scheduledFor ?? null,
        expiresAt: dto.expiresAt ?? null,
        recipients: {
          createMany: {
            data: users.map((u) => ({
              recipientId: u.id,
            })),
            skipDuplicates: true,
          },
        },
      },
      include: { recipients: true },
    });

    await this.deliver(notification, { emitSocket: true });
    return notification;
  }

  async markRead(notificationId: string, userId: string) {
    const recipient = await this.prisma.notificationRecipient.findUnique({
      where: {
        notificationId_recipientId: {
          notificationId,
          recipientId: userId,
        },
      },
    });

    if (!recipient) throw new NotFoundException('Notification not found');

    return this.prisma.notificationRecipient.update({
      where: { id: recipient.id },
      data: { readAt: new Date() },
    });
  }

  async listForUser(userId: string) {
    return this.prisma.notificationRecipient.findMany({
      where: { recipientId: userId },
      include: { notification: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async deliver(
    notification: Notification & {
      recipients?: { id: string; recipientId: string }[];
    },
    options: DeliverOptions = {},
  ) {
    const channels = notification.channels as NotificationChannel[];

    if (notification.recipients?.length) {
      for (const r of notification.recipients) {
        if (options.emitSocket !== false) {
          this.ws.emitToUser(r.recipientId, 'notification', notification);
        }

        await this.prisma.notificationRecipient.update({
          where: { id: r.id },
          data: { deliveredAt: new Date() },
        });
      }
    }

    // Future: enqueue async jobs
    if (channels.includes('EMAIL')) {
      // enqueue to email worker
    }
    if (channels.includes('SMS')) {
      // enqueue to SMS worker
    }
    if (channels.includes('PUSH')) {
      // enqueue to push worker
    }
    if (channels.includes('WEBHOOK')) {
      // enqueue to webhook worker
    }
  }
}
