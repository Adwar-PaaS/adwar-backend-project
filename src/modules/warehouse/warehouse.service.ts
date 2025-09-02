import { Injectable } from '@nestjs/common';
import { WarehouseRepository } from './warehouse.repository';
import { ApiError } from '../../common/exceptions/api-error.exception';
import { HttpStatus } from '@nestjs/common';

@Injectable()
export class WarehouseService {
  constructor(private readonly warehouseRepo: WarehouseRepository) {}

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

  async getAvaliableDriversInWarehouse(warehouseId: string) {
    return this.warehouseRepo.getAvaliableDriversInWarehouse(warehouseId);
  }

  async getWarehouseOrders(warehouseId: string) {
    const warehouse = await this.warehouseRepo.findOne({
      id: warehouseId,
      deletedAt: null,
    });

    if (!warehouse) {
      throw new ApiError('Warehouse not found', HttpStatus.NOT_FOUND);
    }

    return this.warehouseRepo.getWarehouseOrders(warehouseId);
  }

  async getWarehouseUsers(warehouseId: string) {
    const warehouse = await this.warehouseRepo.findOne({
      id: warehouseId,
      deletedAt: null,
    });

    if (!warehouse) {
      throw new ApiError('Warehouse not found', HttpStatus.NOT_FOUND);
    }

    return this.warehouseRepo.getWarehouseUsers(warehouseId);
  }

  async getWarehouseUsersDrivers(warehouseId: string) {
    const warehouse = await this.warehouseRepo.findOne({
      id: warehouseId,
      deletedAt: null,
    });

    if (!warehouse) {
      throw new ApiError('Warehouse not found', HttpStatus.NOT_FOUND);
    }

    return this.warehouseRepo.getWarehouseUsersDrivers(warehouseId);
  }
}
