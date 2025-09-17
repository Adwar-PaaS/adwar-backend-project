import { PartialType } from '@nestjs/mapped-types';
import { CreateTenantDto } from './create-tenant.dto';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TransformToArray } from 'src/common/decorators/transform-array.decorator';
import { CreateAddressDto } from 'src/shared/address/dto/create-address.dto';

export class UpdateTenantDto extends PartialType(CreateTenantDto) {
  @IsOptional()
  // @TransformToArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAddressDto)
  address?: CreateAddressDto & { id?: string };
}
