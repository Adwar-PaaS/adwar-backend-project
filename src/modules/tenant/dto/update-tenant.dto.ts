import { PartialType } from '@nestjs/mapped-types';
import { CreateTenantDto } from './create-tenant.dto';
import { TenantAddressUpdateDto } from 'src/shared/address/dto/tenant-address-update.dto';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class UpdateTenantDto extends PartialType(CreateTenantDto) {
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch (error) {
        return value;
      }
    }
    return value;
  })
  @ValidateNested({ each: true })
  @Type(() => TenantAddressUpdateDto)
  addresses?: TenantAddressUpdateDto[];
}
