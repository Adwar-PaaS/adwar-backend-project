import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateScannerDeviceDto {
  @IsString()
  deviceId: string;

  @IsString()
  deviceName: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  registeredAt?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  lastSeenAt?: Date;
}
