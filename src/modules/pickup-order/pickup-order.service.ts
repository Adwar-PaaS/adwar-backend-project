import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePickupOrderDto } from './dto/create-pickup-order.dto';
import { UpdatePickupOrderDto } from './dto/update-pickup-order.dto';
import { PickupOrderRepository } from './pickup-order.repository';
import { PickupRequestRepository } from '../pickup-request/pickup-request.repository';

@Injectable()
export class PickupOrderService {
  constructor(
    private readonly pickupOrderRepo: PickupOrderRepository,
    private readonly pickupRequestRepo: PickupRequestRepository,
  ) {}

  async create(dto: CreatePickupOrderDto) {
    const pickupRequest = await this.pickupRequestRepo.findOne(
      dto.pickUpRequestId,
    );
    if (!pickupRequest) {
      throw new NotFoundException(
        `PickupRequest ${dto.pickUpRequestId} not found`,
      );
    }

    const order = await this.pickupRequestRepo.findOrdersByIds([dto.orderId]);
    if (!order || order.length === 0) {
      throw new NotFoundException(`Order ${dto.orderId} not found`);
    }

    return this.pickupOrderRepo.create({
      pickUpRequest: { connect: { id: dto.pickUpRequestId } },
      order: { connect: { id: dto.orderId } },
    });
  }

  async findAll() {
    return this.pickupOrderRepo.findAll();
  }

  async findOne(id: string) {
    const record = await this.pickupOrderRepo.findOne(id);
    if (!record) throw new NotFoundException(`PickupOrder ${id} not found`);
    return record;
  }

  async update(id: string, dto: UpdatePickupOrderDto) {
    const updateData: any = {};
    
    if (dto.pickUpRequestId) {
      updateData.pickUpRequest = { connect: { id: dto.pickUpRequestId } };
    }
    
    if (dto.orderId) {
      updateData.order = { connect: { id: dto.orderId } };
    }
    
    return this.pickupOrderRepo.update(id, updateData);
  }

  async remove(id: string) {
    return this.pickupOrderRepo.remove(id);
  }
}
