import { IsEnum, IsOptional, IsString } from 'class-validator';
import { RequestStatus } from '@prisma/client';

export class UpdateRequestStatusDto {
  @IsEnum(RequestStatus)
  status: RequestStatus;

  @IsOptional()
  @IsString()
  responseMsg?: string;
}
