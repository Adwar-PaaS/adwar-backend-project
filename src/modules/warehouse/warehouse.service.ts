import { Injectable } from '@nestjs/common';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';
import { WarehouseRepository } from './warehouse.repository';
import { IWarehouse } from './interfaces/warehouse.interface';

@Injectable()
export class WarehouseService {
  constructor(private readonly warehouseRepo: WarehouseRepository) {}

  async create(dto: CreateWarehouseDto): Promise<IWarehouse> {
    return this.warehouseRepo.createWarehouse(dto);
  }

  findAll(query: Record<string, any>) {
    return this.warehouseRepo.findAllWithTenant(query);
  }

  findById(id: string): Promise<IWarehouse> {
    return this.warehouseRepo.getById(id);
  }

  async update(id: string, dto: UpdateWarehouseDto): Promise<IWarehouse> {
    return this.warehouseRepo.updateWarehouse(id, dto);
  }

  async delete(id: string): Promise<IWarehouse> {
    return this.warehouseRepo.deleteWarehouse(id);
  }
}
