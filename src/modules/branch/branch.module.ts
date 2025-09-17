import { Module } from '@nestjs/common';
import { BranchService } from './branch.service';
import { BranchController } from './branch.controller';
import { BranchRepository } from './branch.repository';
import { AddressModule } from 'src/shared/address/address.module';
import { PickUpModule } from '../pickup/pickup.module';

@Module({
  imports: [AddressModule, PickUpModule],
  controllers: [BranchController],
  providers: [BranchService, BranchRepository],
  exports: [BranchService, BranchRepository],
})
export class BranchModule {}
