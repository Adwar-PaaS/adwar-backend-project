import { Status } from '@prisma/client';
import { IAddress } from 'src/shared/address/interfaces/address.interface';

export interface ITenant {
  id: string;
  name: string;
  slug: string;
  status: Status;
  logoUrl: string | null;
  email: string | null;
  phone: string | null;
  creator?: {
    firstName: string;
    lastName: string;
  } | null;
  address?: IAddress;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}
