import { Expose, Type } from 'class-transformer';
import {
  Status,
  RoleName,
  ActionType,
  EntityType,
  AddressType,
} from '@prisma/client';

class RoleViewDto {
  @Expose()
  id!: string;

  @Expose()
  name!: RoleName;

  @Expose()
  @Type(() => PermissionViewDto)
  permissions!: PermissionViewDto[];
}

class PermissionViewDto {
  @Expose()
  entityType!: EntityType;

  @Expose()
  actions!: ActionType[];
}

class AddressViewDto {
  @Expose()
  id!: string;

  @Expose()
  address1!: string;

  @Expose()
  address2!: string | null;

  @Expose()
  district!: string | null;

  @Expose()
  city!: string;

  @Expose()
  state!: string | null;

  @Expose()
  country!: string;

  @Expose()
  postalCode!: string | null;

  @Expose()
  latitude!: number | null;

  @Expose()
  longitude!: number | null;

  @Expose()
  landmark!: string | null;

  @Expose()
  instructions!: string | null;

  @Expose()
  type!: AddressType;

  @Expose()
  isPrimary!: boolean;

  @Expose()
  isDefault!: boolean;
}

class TenantViewDto {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  slug!: string;

  @Expose()
  status!: Status;

  @Expose()
  logoUrl!: string | null;

  @Expose()
  email!: string | null;

  @Expose()
  phone!: string | null;
}

export class UserViewDto {
  @Expose()
  id!: string;

  @Expose()
  firstName!: string;

  @Expose()
  lastName!: string;

  @Expose()
  email!: string;

  @Expose()
  phone!: string | null;

  @Expose()
  avatar!: string | null;

  @Expose()
  status!: Status;

  @Expose()
  lastLoginAt!: Date | null;

  @Expose()
  joinedAt!: Date;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;

  @Expose()
  @Type(() => RoleViewDto)
  role!: RoleViewDto;

  @Expose()
  @Type(() => AddressViewDto)
  addresses!: AddressViewDto[];

  @Expose()
  @Type(() => TenantViewDto)
  tenant!: TenantViewDto | null;
}
