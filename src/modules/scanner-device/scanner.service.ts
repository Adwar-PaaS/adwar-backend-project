import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ScannerRepository } from './scanner.repository';
import { CreateScannerDeviceDto } from './dto/create-scanner-device.dto';
import { ScannerDevice } from '@prisma/client';

@Injectable()
export class ScannerDeviceService {
  constructor(private readonly scannerRepo: ScannerRepository) {}

  async registerDevice(dto: CreateScannerDeviceDto): Promise<ScannerDevice> {
    return this.scannerRepo.create(dto);
  }

  async updateDevice(
    id: string,
    dto: Partial<CreateScannerDeviceDto>,
  ): Promise<ScannerDevice> {
    return this.scannerRepo.update(id, dto);
  }

  async getDeviceById(id: string): Promise<ScannerDevice> {
    const device = await this.scannerRepo.findOne({ id });

    if (!device) {
      throw new NotFoundException(`Scanner device with id ${id} not found`);
    }

    if (!device.isActive) {
      throw new UnauthorizedException('Invalid or deactivated scanner device');
    }

    return device;
  }

  async deleteDevice(id: string): Promise<void> {
    await this.scannerRepo.delete(id);
  }

  async getAllBranchDevices(branchId: string): Promise<ScannerDevice[]> {
    return this.scannerRepo.findMany({ branchId });
  }

  async getAllTenantDevices(tenantId: string): Promise<ScannerDevice[]> {
    return this.scannerRepo.findMany({ branch: { tenantId } });
  }

  async validateDevice(deviceId: string): Promise<ScannerDevice> {
    const device = await this.scannerRepo.findOne({ deviceId });

    if (!device || !device.isActive) {
      throw new UnauthorizedException('Invalid or deactivated scanner device');
    }

    return this.scannerRepo.update(device.id, {
      lastSeenAt: new Date(),
    });
  }
}
