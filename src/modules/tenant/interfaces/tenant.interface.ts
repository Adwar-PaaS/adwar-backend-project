import { Status, Address } from '@prisma/client';

export interface ITenant {
  id: string;
  name: string;
  slug: string;
  status: Status;
  logoUrl: string | null;
  email: string | null;
  phone: string | null;
  creator?: {
    fullName: string;
  } | null;
  addresses?: Address[];
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}
