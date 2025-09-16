import { Injectable } from '@nestjs/common';
import { ShipmentRepository } from './shipment.repository';
import { IShipment } from './interfaces/shipment.interface';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';
// import { UpdateShipmentStatusDto } from './dto/update-shipment-status.dto';

@Injectable()
export class ShipmentService {
  constructor(private readonly shipmentRepo: ShipmentRepository) {}

  create(dto: CreateShipmentDto): Promise<IShipment> {
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

  findOne(id: string): Promise<IShipment> {
    return this.shipmentRepo.findOne({ id });
  }

  update(id: string, dto: UpdateShipmentDto): Promise<IShipment> {
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
