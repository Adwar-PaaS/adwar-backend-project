import { Module } from '@nestjs/common';
import { AttachmentService } from './attachment.service';
import { PrismaClient } from '@prisma/client';

@Module({
  providers: [AttachmentService, PrismaClient],
  exports: [AttachmentService],
})
export class AttachmentModule {}

// Example Usage in OrderService

// @Injectable()
// export class OrderService {
//   constructor(
//     private readonly prisma: PrismaService,
//     private readonly attachmentService: AttachmentService,
//   ) {}

//   async createProduct(dto: CreateProductDto, fileUrl: string) {
//     const product = await this.prisma.product.create({
//       data: { name: dto.name, price: dto.price },
//     });

//     await this.attachmentService.create({
//       url: fileUrl,
//       type: 'IMAGE',
//       entityId: product.id,
//       entityType: 'PRODUCT',
//     });

//     return product;
//   }
// }
