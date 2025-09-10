import { IsUUID, IsOptional } from 'class-validator';

export class AttachUserToTenantDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  tenantId: string;

  @IsOptional()
  @IsUUID()
  branchId?: string | null;
}
