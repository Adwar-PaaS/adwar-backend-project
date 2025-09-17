import {
  IsUUID,
  IsOptional,
  IsDateString,
  IsString,
  ValidateNested,
} from 'class-validator';
import { CreateAddressDto } from '../../../shared/address/dto/create-address.dto';
import { Type } from 'class-transformer';

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

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateAddressDto)
  address?: CreateAddressDto;
}
