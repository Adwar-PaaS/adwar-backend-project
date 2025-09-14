import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BranchCategory, BranchStatus, BranchType } from '@prisma/client';
import { CreateAddressDto } from 'src/shared/address/dto/create-address.dto';

export class CreateBranchDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsUUID()
  @IsOptional()
  addressId?: string;

  @ValidateNested()
  @Type(() => CreateAddressDto)
  @IsOptional()
  address?: CreateAddressDto;

  @IsUUID()
  @IsOptional()
  tenantId?: string;

  @IsUUID()
  @IsOptional()
  customerId?: string;

  @IsEnum(BranchStatus)
  @IsOptional()
  status?: BranchStatus = BranchStatus.ACTIVE;

  @IsEnum(BranchType)
  @IsOptional()
  type?: BranchType = BranchType.MAIN;

  @IsEnum(BranchCategory)
  @IsOptional()
  category?: BranchCategory = BranchCategory.WAREHOUSE;
}
