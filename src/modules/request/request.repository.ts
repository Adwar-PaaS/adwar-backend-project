import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma/prisma.service';
import { Prisma, RequestStatus } from '@prisma/client';

@Injectable()
export class RequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.RequestCreateInput) {
    return this.prisma.request.create({
      data,
      include: { sender: true, responder: true },
    });
  }

  async findAll() {
    return this.prisma.request.findMany({
      include: { sender: true, responder: true },
    });
  }

  async findOne(id: string) {
    return this.prisma.request.findUnique({
      where: { id },
      include: { sender: true, responder: true },
    });
  }

  async updateStatus(
    id: string,
    status: RequestStatus,
    responseMsg?: string,
    responderId?: string,
  ) {
    return this.prisma.request.update({
      where: { id },
      data: { status, responseMsg, responderId },
      include: { sender: true, responder: true },
    });
  }
}
