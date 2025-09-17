import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/db/prisma/prisma.service';
import { Attachment, EntityType } from '@prisma/client';
import { BaseRepository } from '../factory/base.repository';

@Injectable()
export class AttachmentRepository extends BaseRepository<Attachment> {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma, 'attachment', ['filename']);
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
