import {
  IsEnum,
  IsOptional,
  IsString,
  IsEmail,
  ValidateNested,
} from 'class-validator';

import { Status } from '@prisma/client';
import { Type } from 'class-transformer';
import { CreateAddressDto } from 'src/shared/address/dto/create-address.dto';

export class CreateTenantDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsEnum(Status)
  status?: Status;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  logoUrl?: string;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateAddressDto)
  addresses?: CreateAddressDto[];
}
