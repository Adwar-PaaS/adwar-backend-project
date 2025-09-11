import { Status, Address } from '@prisma/client';

// interface IAddress {
//   id: string;
//   address1: string;
//   city: string;
//   country: string;
//   latitude?: string | null;
//   longitude?: string | null;
// }

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
