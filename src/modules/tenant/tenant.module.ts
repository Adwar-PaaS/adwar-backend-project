import { Module } from '@nestjs/common';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';
import { TenantRepository } from './tenant.repository';
import { CloudinaryModule } from '../../shared/upload/cloudinary.module';
import { PermissionModule } from '../../shared/permission/permission.module';
import { AddressModule } from 'src/shared/address/address.module';

@Module({
  imports: [CloudinaryModule, PermissionModule, AddressModule],
  controllers: [TenantController],
  providers: [TenantService, TenantRepository],
  exports: [TenantService],
})
export class TenantModule {}
