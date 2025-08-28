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

//   async createOrder(dto: CreateOrderDto, fileUrl: string) {
//     const order = await this.prisma.order.create({
//       data: { sku: dto.sku, totalPrice: dto.totalPrice },
//     });

//     await this.attachmentService.create({
//       url: fileUrl,
//       type: 'IMAGE',
//       relatedId: order.id,
//       relatedType: 'ORDER',
//     });

//     return order;
//   }
// }
