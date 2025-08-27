// import { Injectable, NotFoundException } from '@nestjs/common';
// import { PrismaClient, Attachment } from '@prisma/client';
// import { CreateAttachmentDto } from './dto/create-attachment.dto';
// import { UpdateAttachmentDto } from './dto/update-attachment.dto';

// @Injectable()
// export class AttachmentService {
//   constructor(private readonly prisma: PrismaClient) {}

//   async create(dto: CreateAttachmentDto): Promise<Attachment> {
//     return this.prisma.attachment.create({
//       data: {
//         ...dto,
//       },
//     });
//   }

//   findManyByEntity(
//     entityType: string,
//     entityId: string,
//   ): Promise<Attachment[]> {
//     return this.prisma.attachment.findMany({
//       where: {
//         entityType,
//         entityId,
//       },
//       orderBy: { createdAt: 'desc' },
//     });
//   }

//   findOne(id: string): Promise<Attachment | null> {
//     return this.prisma.attachment.findUnique({
//       where: { id },
//     });
//   }

//   async update(id: string, dto: UpdateAttachmentDto): Promise<Attachment> {
//     const existing = await this.prisma.attachment.findUnique({
//       where: { id },
//     });
//     if (!existing) {
//       throw new NotFoundException(`Attachment with ID ${id} not found`);
//     }
//     return this.prisma.attachment.update({
//       where: { id },
//       data: {
//         ...dto,
//       },
//     });
//   }

//   async delete(id: string): Promise<void> {
//     const existing = await this.prisma.attachment.findUnique({
//       where: { id },
//     });
//     if (!existing) {
//       throw new NotFoundException(`Attachment with ID ${id} not found`);
//     }
//     await this.prisma.attachment.delete({
//       where: { id },
//     });
//   }
// }
