import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../db/prisma/prisma.service';
import { RequestStatus } from '@prisma/client';

@Injectable()
export class PickUpRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(pickupId: string, requestedBy: string) {
    return this.prisma.pickUpRequest.create({
      data: { pickupId, requestedBy },
    });
  }

  async respond(requestId: string, respondedBy: string, status: RequestStatus) {
    return this.prisma.pickUpRequest.update({
      where: { id: requestId },
      data: { respondedBy, status },
    });
  }

  async findRequestsByPickup(pickupId: string) {
    return this.prisma.pickUpRequest.findMany({
      where: { pickupId },
      include: { requester: true, responder: true },
    });
  }
}
