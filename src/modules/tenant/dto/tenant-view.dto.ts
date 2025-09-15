import { Expose, Type } from 'class-transformer';

class TenantCreatorDto {
  @Expose()
  id!: string;

  @Expose()
  firstName!: string;

  @Expose()
  lastName!: string;
}

class TenantAddressDto {
  @Expose()
  id!: string;

  @Expose()
  address1!: string;

  @Expose()
  city!: string;

  @Expose()
  country!: string;
}

export class TenantViewDto {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  slug!: string;

  @Expose()
  status!: string;

  @Expose()
  logoUrl!: string | null;

  @Expose()
  email!: string | null;

  @Expose()
  phone!: string | null;

  @Expose()
  website!: string | null;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;

  @Expose()
  @Type(() => TenantCreatorDto)
  creator?: TenantCreatorDto | null;

  @Expose()
  @Type(() => TenantAddressDto)
  address?: TenantAddressDto | null;
}
