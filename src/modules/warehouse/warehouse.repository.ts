import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../db/prisma/prisma.service';
import { Warehouse } from '@prisma/client';
import { BaseRepository } from '../../shared/factory/base.repository';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';

type CreateWarehouseInput = CreateWarehouseDto;
type UpdateWarehouseInput = UpdateWarehouseDto;

const tenantSelect = { tenant: { select: { name: true } } };

@Injectable()
export class WarehouseRepository extends BaseRepository<Warehouse> {
  constructor(private readonly prismaService: PrismaService) {
    super(prismaService, prismaService.warehouse, ['location']);
  }

  async createWarehouse(data: CreateWarehouseInput): Promise<Warehouse> {
    return this.model.create({
      data: {
        ...data,
        tenant: { connect: { id: data.tenantId } },
      },
      include: tenantSelect,
    });
  }

  async findAllWithTenant(queryString: Record<string, any>) {
    return this.findAll(queryString, {}, tenantSelect);
  }

  async getById(id: string): Promise<Warehouse> {
    const warehouse = await this.model.findUnique({
      where: { id },
      include: tenantSelect,
    });
    if (!warehouse) throw new NotFoundException('Warehouse not found');
    return warehouse;
  }

  async updateWarehouse(id: string, data: UpdateWarehouseInput): Promise<Warehouse> {
    // Ensure warehouse exists
    await this.getById(id);

    return this.model.update({
      where: { id },
      data,
      include: tenantSelect,
    });
  }

  async deleteWarehouse(id: string): Promise<Warehouse> {
    // Ensure warehouse exists
    await this.getById(id);

    return this.model.delete({
      where: { id },
      include: tenantSelect,
    });
  }
}
