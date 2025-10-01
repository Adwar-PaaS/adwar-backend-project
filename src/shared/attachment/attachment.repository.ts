import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma/prisma.service';
import { Attachment, EntityType, Prisma } from '@prisma/client';
import { RedisService } from 'src/db/redis/redis.service';
import { BaseRepository } from '../factory/base.repository';

export type SafeAttachment = Attachment;

@Injectable()
export class AttachmentRepository extends BaseRepository<
  Attachment,
  SafeAttachment,
  Prisma.AttachmentDelegate
> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly redis: RedisService,
  ) {
    super(prisma, prisma.attachment, ['filename']);
  }

  async findManyByEntity(
    relatedType: EntityType,
    relatedId: string,
  ): Promise<Attachment[]> {
    return this.prisma.attachment.findMany({
      where: { relatedType, relatedId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }
}
