import { PartialType } from '@nestjs/mapped-types';
import { CreateAddressDto } from './create-address.dto';
import { IsUUID, IsOptional } from 'class-validator';

export class UpdateAddressDto extends PartialType(CreateAddressDto) {
  @IsUUID()
  @IsOptional()
  id?: string;
}
