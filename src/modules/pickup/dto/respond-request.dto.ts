import { IsUUID, IsEnum } from 'class-validator';
import { RequestStatus } from '@prisma/client';

export class RespondRequestDto {
  @IsUUID()
  requestId: string;

  @IsEnum(RequestStatus)
  status: RequestStatus;
}
