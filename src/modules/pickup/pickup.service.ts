import { BadRequestException, Injectable } from '@nestjs/common';
import { PickUpRepository } from './pickup.repository';
import {
  RequestStatus,
  OrderStatus,
  PickUpStatus,
  EntityType,
  NotificationCategory,
} from '@prisma/client';
import { NotificationService } from 'src/shared/notification/notification.service';
import { CreatePickupDto } from './dto/create-pickup.dto';
import { UpdatePickupDto } from './dto/update-pickup.dto';

@Injectable()
export class PickUpService {
  constructor(
    private readonly pickupRepo: PickUpRepository,
    private readonly notificationService: NotificationService,
  ) {}

  async createPickup(dto: CreatePickupDto) {
    return this.pickupRepo.create(dto);
  }

  async updatePickup(id: string, dto: UpdatePickupDto) {
    return this.pickupRepo.update(id, dto);
  }

  async deletePickup(pickupId: string) {
    return this.pickupRepo.delete(pickupId);
  }
}
