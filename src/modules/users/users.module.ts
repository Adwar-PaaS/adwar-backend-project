import { Module } from '@nestjs/common';
import { PrismaModule } from '../../db/prisma/prisma.module';
import { UserService } from './users.service';
import { UserController } from './users.controller';

@Module({
  imports: [PrismaModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
