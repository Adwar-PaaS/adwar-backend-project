import { PartialType } from '@nestjs/mapped-types';
import { CreateTenantDto } from './create-tenant.dto';
import { TenantAddressUpdateDto } from 'src/shared/address/dto/tenant-address-update.dto';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateTenantDto extends PartialType(CreateTenantDto) {
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => TenantAddressUpdateDto)
  addresses?: TenantAddressUpdateDto[];
}
