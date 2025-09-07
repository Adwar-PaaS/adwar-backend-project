import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../db/prisma/prisma.service';

@Injectable()
export class PickUpRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create() {
    return this.prisma.pickUp.create({ data: {} });
  }

  async delete(id: string) {
    return this.prisma.pickUp.delete({ where: { id } });
  }

  async findById(id: string) {
    return this.prisma.pickUp.findUnique({
      where: { id },
      include: { orders: true, requests: true },
    });
  }
}
