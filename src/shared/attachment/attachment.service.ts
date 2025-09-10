import { Injectable, NotFoundException } from '@nestjs/common';
import { AttachmentRepository } from './attachment.repository';
import { CreateAttachmentDto } from './dto/create-attachment.dto';
import { UpdateAttachmentDto } from './dto/update-attachment.dto';
import { Attachment, EntityType } from '@prisma/client';

@Injectable()
export class AttachmentService {
  constructor(private readonly attachmentRepo: AttachmentRepository) {}

  async create(dto: CreateAttachmentDto): Promise<Attachment> {
    return this.attachmentRepo.create(dto);
  }

  async update(id: string, dto: UpdateAttachmentDto): Promise<Attachment> {
    return this.attachmentRepo.update(id, dto);
  }

  async findOne(id: string): Promise<Attachment> {
    const attachment = await this.attachmentRepo.findOne({ id });
    if (!attachment) throw new NotFoundException('Attachment not found');
    return attachment;
  }

  async delete(id: string): Promise<void> {
    return this.attachmentRepo.delete(id);
  }

  async findManyByEntity(
    relatedType: EntityType,
    relatedId: string,
  ): Promise<Attachment[]> {
    return this.attachmentRepo.findManyByEntity(relatedType, relatedId);
  }
}
