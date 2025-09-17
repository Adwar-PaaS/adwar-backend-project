import { Module } from '@nestjs/common';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';
import { TenantRepository } from './tenant.repository';
import { CloudinaryModule } from '../../shared/upload/cloudinary.module';
import { PermissionModule } from '../../shared/permission/permission.module';
import { AddressModule } from 'src/shared/address/address.module';
import { RolesModule } from '../role/roles.module';
import { UserModule } from '../users/users.module';
import { BranchModule } from '../branch/branch.module';

@Module({
  imports: [
    CloudinaryModule,
    PermissionModule,
    BranchModule,
    AddressModule,
    RolesModule,
    UserModule,
  ],
  controllers: [TenantController],
  providers: [TenantService, TenantRepository],
  exports: [TenantService],
})
export class TenantModule {}
