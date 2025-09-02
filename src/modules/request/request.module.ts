import { Module } from '@nestjs/common';
import { RequestService } from './request.service';
import { RequestController } from './request.controller';
import { RequestRepository } from './request.repository';

@Module({
  controllers: [RequestController],
  providers: [RequestService, RequestRepository],
  exports: [RequestService, RequestRepository],
})
export class RequestModule {}
