import {
  IsUUID,
  IsOptional,
  IsDateString,
  IsString,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { CreateAddressDto } from '../../../shared/address/dto/create-address.dto';
import { Type } from 'class-transformer';
import { PickUpStatus } from '@prisma/client';

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
  @IsEnum(PickUpStatus)
  status?: PickUpStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateAddressDto)
  address?: CreateAddressDto;
}
