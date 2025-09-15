import { ITenant } from '../interfaces/tenant.interface';
import { TenantViewDto } from '../dto/tenant-view.dto';
import { plainToInstance } from 'class-transformer';

export type TenantView = TenantViewDto;

export function mapTenantView(tenant: ITenant): TenantView {
  return plainToInstance(TenantViewDto, tenant as any, {
    excludeExtraneousValues: true,
  });
}

export function mapTenantViews(tenants: ITenant[]): TenantView[] {
  return tenants.map(mapTenantView);
}
