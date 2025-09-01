import { IsEnum } from 'class-validator';
import { RequestStatus } from '@prisma/client';

export class UpdatePickupRequestStatusDto {
  @IsEnum(RequestStatus)
  status: RequestStatus;
}
