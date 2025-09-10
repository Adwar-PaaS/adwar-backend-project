import { 
  IsEnum, 
  IsNotEmpty, 
  IsOptional, 
  IsString, 
  IsUUID 
} from 'class-validator';
import { BranchCategory, BranchStatus, BranchType } from '@prisma/client';

export class CreateBranchDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsUUID()
  @IsNotEmpty()
  addressId: string;

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
