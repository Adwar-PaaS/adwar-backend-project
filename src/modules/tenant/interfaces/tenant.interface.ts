import { TenantStatus } from '@prisma/client';

export interface ITenant {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  lastLogin: Date | null;
  logoUrl: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
  createdBy: string;
  creator?: {
    fullName: string;
  };
  createdAt: Date;
  updatedAt: Date;
}
