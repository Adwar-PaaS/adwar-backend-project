import { Module } from '@nestjs/common';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';
import { TenantRepository } from './tenant.repository';
import { UploadService } from '../../shared/upload/upload.service';
import { CloudinaryModule } from '../../shared/upload/cloudinary.module';
import { PermissionModule } from '../../shared/permission/permission.module';

@Module({
  imports: [CloudinaryModule, PermissionModule],
  controllers: [TenantController],
  providers: [TenantService, TenantRepository, UploadService],
  exports: [TenantService],
})
export class TenantModule {}
