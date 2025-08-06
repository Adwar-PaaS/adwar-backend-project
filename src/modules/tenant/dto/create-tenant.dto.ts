import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { TenantStatus } from '../../../common/enums/tenant-status.enum';

export class CreateTenantDto {
  @IsEnum(TenantStatus)
  @IsOptional()
  status: TenantStatus = TenantStatus.ACTIVATE;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  address?: string;
}
