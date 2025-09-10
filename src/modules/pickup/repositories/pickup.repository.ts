import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../db/prisma/prisma.service';
import { PickUpStatus } from '@prisma/client';

@Injectable()
export class PickUpRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    scheduledFor?: Date;
    driverId?: string;
    branchId?: string;
    notes?: string;
  }) {
    return this.prisma.pickUp.create({
      data,
    });
  }

  async updateStatus(id: string, status: PickUpStatus) {
    return this.prisma.pickUp.update({
      where: { id },
      data: { status },
    });
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
