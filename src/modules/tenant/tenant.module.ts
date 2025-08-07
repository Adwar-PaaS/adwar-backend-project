import { Module } from '@nestjs/common';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';
import { TenantRepository } from './tenant.repository';
import { UploadService } from '../../shared/upload/upload.service';
import { CloudinaryModule } from '../../shared/upload/cloudinary.module';

@Module({
  imports: [CloudinaryModule],
  controllers: [TenantController],
  providers: [TenantService, TenantRepository, UploadService],
  exports: [TenantService],
})
export class TenantModule {}
