import { Module } from '@nestjs/common';
import { BranchService } from './branch.service';
import { BranchController } from './branch.controller';
import { BranchRepository } from './branch.repository';
import { AddressModule } from 'src/shared/address/address.module';

@Module({
  imports: [AddressModule],
  controllers: [BranchController],
  providers: [BranchService, BranchRepository],
  exports: [BranchService, BranchRepository],
})
export class BranchModule {}
