import { Injectable } from '@nestjs/common';
import { ShipmentRepository } from './shipment.repository';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';
import { Shipment } from '@prisma/client';
// import { UpdateShipmentStatusDto } from './dto/update-shipment-status.dto';

@Injectable()
export class ShipmentService {
  constructor(private readonly shipmentRepo: ShipmentRepository) {}

  create(dto: CreateShipmentDto): Promise<Shipment> {
    const data: any = {
      ...dto,
      estimatedDelivery: dto.estimatedDelivery
        ? new Date(dto.estimatedDelivery)
        : undefined,
    };
    return this.shipmentRepo.create(data);
  }

  findAll(query: Record<string, any>) {
    return this.shipmentRepo.findAll(query);
  }

  async findOne(id: string): Promise<Shipment> {
    const shipment = await this.shipmentRepo.findOne({ id });
    if (!shipment) {
      throw new Error(`Shipment with id ${id} not found`);
    }
    return shipment;
  }

  update(id: string, dto: UpdateShipmentDto): Promise<Shipment> {
    const data: any = {
      ...dto,
      estimatedDelivery: dto.estimatedDelivery
        ? new Date(dto.estimatedDelivery)
        : undefined,
    };
    return this.shipmentRepo.update(id, data);
  }

  // updateStatus(id: string, dto: UpdateShipmentStatusDto): Promise<IShipment> {
  //   return this.shipmentRepo.update(id, { status: dto.status });
  // }

  delete(id: string): Promise<void> {
    return this.shipmentRepo.delete(id);
  }
}
