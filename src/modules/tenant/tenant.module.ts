import { Module } from '@nestjs/common';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';
import { PrismaModule } from '../../db/prisma/prisma.module';
import { CloudinaryModule } from '../../shared/upload/cloudinary.module';

@Module({
  imports: [PrismaModule, CloudinaryModule],
  providers: [TenantService],
  controllers: [TenantController],
})
export class TenantModule {}
