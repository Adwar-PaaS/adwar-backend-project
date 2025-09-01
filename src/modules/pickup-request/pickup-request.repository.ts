import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma/prisma.service';
import { Prisma, RequestStatus } from '@prisma/client';

@Injectable()
export class PickupRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.PickUpRequestCreateInput) {
    return this.prisma.pickUpRequest.create({
      data,
      include: {
        orders: { include: { order: true } },
        requester: true,
      },
    });
  }

  async findAll() {
    return this.prisma.pickUpRequest.findMany({
      include: {
        orders: { include: { order: true } },
        requester: true,
        responder: true,
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.pickUpRequest.findUnique({
      where: { id },
      include: {
        orders: { include: { order: true } },
        requester: true,
        responder: true,
      },
    });
  }

  async updateStatus(id: string, status: RequestStatus) {
    return this.prisma.pickUpRequest.update({
      where: { id },
      data: { status },
      include: {
        orders: { include: { order: true } },
        requester: true,
        responder: true,
      },
    });
  }

  async findUserById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findOrdersByIds(ids: string[]) {
    return this.prisma.order.findMany({ where: { id: { in: ids } } });
  }
}
