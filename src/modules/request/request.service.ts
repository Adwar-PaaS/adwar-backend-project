import { Injectable, NotFoundException } from '@nestjs/common';
import { RequestRepository } from './request.repository';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestStatusDto } from './dto/update-request-status.dto';
import { AuthUser } from '../auth/interfaces/auth-user.interface';

@Injectable()
export class RequestService {
  constructor(private readonly repo: RequestRepository) {}

  async create(user: AuthUser, dto: CreateRequestDto) {
    return this.repo.create({
      entityType: dto.entityType,
      entityId: dto.entityId,
      actionType: dto.actionType,
      reason: dto.reason,
      sender: { connect: { id: user.id } },
    });
  }

  async findAll() {
    return this.repo.findAll();
  }

  async findOne(id: string) {
    const record = await this.repo.findOne(id);
    if (!record) throw new NotFoundException(`Request ${id} not found`);
    return record;
  }

  async updateStatus(user: AuthUser, id: string, dto: UpdateRequestStatusDto) {
    const record = await this.repo.findOne(id);
    if (!record) throw new NotFoundException(`Request ${id} not found`);

    return this.repo.updateStatus(id, dto.status, dto.responseMsg, user.id);
  }
}
