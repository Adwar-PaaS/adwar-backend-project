import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UserModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AuthRepository } from './auth.repository';
import { RoleController } from './controllers/role.controller';
import { PermissionService } from './services/permission.service';
import { RoleService } from './services/role.service';

@Module({
  imports: [ConfigModule, UserModule],
  providers: [AuthService, AuthRepository, PermissionService, RoleService],
  controllers: [AuthController, RoleController],
  exports: [AuthService, PermissionService, RoleService],
})
export class AuthModule {}
