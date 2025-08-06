import { IsEnum } from 'class-validator';
import { TenantStatus } from '../../../common/enums/tenant-status.enum';

export class UpdateTenantStatusDto {
  @IsEnum(TenantStatus)
  status: TenantStatus;
}
