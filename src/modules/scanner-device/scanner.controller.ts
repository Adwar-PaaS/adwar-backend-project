import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ScannerDeviceService } from './scanner.service';
import { APIResponse } from '../../common/utils/api-response.util';
import { SessionGuard } from '../../modules/auth/guards/session.guard';
import { CreateScannerDeviceDto } from './dto/create-scanner-device.dto';

@Controller('scanner-devices')
@UseGuards(SessionGuard)
export class ScannerController {
  constructor(private readonly scannerService: ScannerDeviceService) {}
  @Post()
  async create(@Body() dto: CreateScannerDeviceDto) {
    const device = await this.scannerService.registerDevice(dto);
    return APIResponse.success(
      { device },
      'Scanner device registered successfully',
      HttpStatus.CREATED,
    );
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    const device = await this.scannerService.getDeviceById(id);
    return APIResponse.success(
      { device },
      'Scanner device retrieved successfully',
    );
  }

  //   @Get('branch/:branchId')
  //   async getAllBranchDevices(@Param('branchId') branchId: string) {
  //     const devices = await this.scannerService.getAllBranchDevices(branchId);
  //     return APIResponse.success(
  //       { devices },
  //       'Branch scanner devices retrieved successfully',
  //     );
  //   }

  //   @Get('tenant/:tenantId')
  //   async getAllTenantDevices(@Param('tenantId') tenantId: string) {
  //     const devices = await this.scannerService.getAllTenantDevices(tenantId);
  //     return APIResponse.success(
  //       { devices },
  //       'Tenant scanner devices retrieved successfully',
  //     );
  //   }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateScannerDeviceDto>,
  ) {
    const device = await this.scannerService.updateDevice(id, dto);
    return APIResponse.success(
      { device },
      'Scanner device updated successfully',
    );
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.scannerService.deleteDevice(id);
    return APIResponse.success(null, 'Scanner device deleted successfully');
  }

  @Post('validate/:deviceId')
  async validate(@Param('deviceId') deviceId: string) {
    const device = await this.scannerService.validateDevice(deviceId);
    return APIResponse.success(
      { device },
      'Scanner device validated successfully',
    );
  }
}
