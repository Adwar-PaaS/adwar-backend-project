import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class PickupOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.PickUpOrderCreateInput) {
    return this.prisma.pickUpOrder.create({
      data,
      include: { order: true, pickUpRequest: true },
    });
  }

  async findAll() {
    return this.prisma.pickUpOrder.findMany({
      include: { order: true, pickUpRequest: true },
    });
  }

  async findOne(id: string) {
    return this.prisma.pickUpOrder.findUnique({
      where: { id },
      include: { order: true, pickUpRequest: true },
    });
  }

  async update(id: string, data: Prisma.PickUpOrderUpdateInput) {
    return this.prisma.pickUpOrder.update({
      where: { id },
      data,
      include: { order: true, pickUpRequest: true },
    });
  }

  async remove(id: string) {
    return this.prisma.pickUpOrder.delete({ where: { id } });
  }
}
