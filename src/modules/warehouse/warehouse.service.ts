import { Injectable } from '@nestjs/common';
import { WarehouseRepository } from './warehouse.repository';
import { PrismaClient } from '@prisma/client';
import { ApiError } from '../../common/exceptions/api-error.exception';
import { HttpStatus } from '@nestjs/common';

@Injectable()
export class WarehouseService {
  constructor(
    private readonly warehouseRepo: WarehouseRepository,
    private readonly prisma: PrismaClient,
  ) {}

  async create(dto: any) {
    return this.warehouseRepo.create(dto);
  }

  async update(id: string, dto: any) {
    return this.warehouseRepo.update(id, dto);
  }

  async findAll(query: Record<string, any>) {
    return this.warehouseRepo.findAll(query);
  }

  async findOne(id: string) {
    return this.warehouseRepo.findOne({ id });
  }

  async delete(id: string) {
    return this.warehouseRepo.delete(id);
  }

  async assignUserToWarehouse(userTenantId: string, warehouseId: string) {
    const userTenant = await this.prisma.userTenant.update({
      where: { id: userTenantId },
      data: { warehouseId },
    });

    if (!userTenant) {
      throw new ApiError('UserTenant not found', HttpStatus.NOT_FOUND);
    }

    return userTenant;
  }
}
