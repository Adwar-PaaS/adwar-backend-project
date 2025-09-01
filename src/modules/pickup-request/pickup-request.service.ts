import { Injectable, NotFoundException } from '@nestjs/common';
import { PickupRequestRepository } from './pickup-request.repository';
import { CreatePickupRequestDto } from './dto/create-pickup-request.dto';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { RequestStatus } from '@prisma/client';

@Injectable()
export class PickupRequestService {
  constructor(private readonly repo: PickupRequestRepository) {}

  async create(userId: string, dto: CreatePickupRequestDto) {
    const orders = await this.repo.findOrdersByIds(dto.orderIds);
    if (orders.length !== dto.orderIds.length) {
      throw new NotFoundException(`Some orders not found`);
    }

    return this.repo.create({
      requester: { connect: { id: userId } },
      orders: {
        create: dto.orderIds.map((orderId) => ({ orderId })),
      },
      ...(dto.status ? { status: dto.status } : {}),
    });
  }

  async findAll(user: AuthUser) {
    return this.repo.findAll();
  }

  async findOne(user: AuthUser, id: string) {
    const record = await this.repo.findOne(id);
    if (!record) {
      throw new NotFoundException(`PickupRequest ${id} not found`);
    }
    return record;
  }

  async updateStatus(id: string, status: RequestStatus) {
    const record = await this.repo.findOne(id);
    if (!record) {
      throw new NotFoundException(`PickupRequest ${id} not found`);
    }

    return this.repo.updateStatus(id, status);
  }
}
