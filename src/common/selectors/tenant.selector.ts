import { Prisma } from '@prisma/client';
import { baseFields, minimalFields } from './base.selector';
import { addressSelector } from './address.selector';
import { limitedUserSelector } from './user.selector';

export const tenantFields = {
  name: true,
  slug: true,
  logoUrl: true,
  email: true,
  phone: true,
  description: true,
  subdomain: true,
  website: true,
  status: true,
  taxNumber: true,
  licenseNumber: true,
  settings: true,
};

export const limitedTenantFields = {
  name: true,
  slug: true,
  logoUrl: true,
  subdomain: true,
  status: true,
};

export const tenantSelector: Prisma.TenantSelect = {
  ...baseFields,
  ...tenantFields,
  address: { select: addressSelector },
  creator: { select: limitedUserSelector },
};

export const limitedTenantSelector: Prisma.TenantSelect = {
  ...minimalFields,
  ...limitedTenantFields,
};
