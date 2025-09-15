import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { PermissionModule } from '../../shared/permission/permission.module';
import { AddressModule } from 'src/shared/address/address.module';

@Module({
  imports: [PermissionModule, AddressModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService, UsersRepository],
})
export class UserModule {}
