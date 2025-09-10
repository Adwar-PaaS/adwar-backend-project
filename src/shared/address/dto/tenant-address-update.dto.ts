import { CreateAddressDto } from './create-address.dto';
import { IsOptional, IsString } from 'class-validator';

export class TenantAddressUpdateDto extends CreateAddressDto {
  @IsOptional()
  @IsString()
  id?: string;
}
