import { IsEnum } from 'class-validator';
import { RequestStatus } from '@prisma/client';

export class RespondRequestDto {
  @IsEnum(RequestStatus)
  status: RequestStatus;
}
  