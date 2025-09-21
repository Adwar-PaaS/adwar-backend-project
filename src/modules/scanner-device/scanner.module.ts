import { Module } from '@nestjs/common';
import { ScannerController } from './scanner.controller';
import { ScannerDeviceService } from './scanner.service';
import { ScannerRepository } from './scanner.repository';

@Module({
  //   imports: [PermissionModule],
  controllers: [ScannerController],
  providers: [ScannerDeviceService, ScannerRepository],
  exports: [ScannerDeviceService, ScannerRepository],
})
export class ScannerModule {}
