import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { Type } from 'class-transformer';
import { ValidateNested, IsOptional } from 'class-validator';
import { CreateAddressDto } from 'src/shared/address/dto/create-address.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateAddressDto)
  addresses?: (CreateAddressDto & { id?: string })[];
}
