import { PartialType } from '@nestjs/mapped-types';
import { CreateTenantDto } from './create-tenant.dto';
import { TenantAddressUpdateDto } from 'src/shared/address/dto/tenant-address-update.dto';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TransformToArray } from 'src/common/decorators/transform-array.decorator';

export class UpdateTenantDto extends PartialType(CreateTenantDto) {
  @IsOptional()
  // @TransformToArray()
  @ValidateNested({ each: true })
  @Type(() => TenantAddressUpdateDto)
  addresses?: TenantAddressUpdateDto[];
}
