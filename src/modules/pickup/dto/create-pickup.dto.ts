import { IsUUID, IsOptional, IsDateString, IsString } from 'class-validator';

export class CreatePickupDto {
  @IsUUID('all', { each: true })
  orderIds: string[];

  @IsOptional()
  @IsDateString()
  scheduledFor?: string;

  @IsOptional()
  @IsUUID()
  driverId?: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
