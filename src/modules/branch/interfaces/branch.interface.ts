import { BranchCategory, BranchStatus, BranchType } from '@prisma/client';
import { IAddress } from 'src/shared/address/interfaces/address.interface';

export interface IBranch {
  id: string;
  name: string;
  code: string;
  status: BranchStatus;
  tenantId?: string;
  customerId?: string;
  creatorId?: string;
  type: BranchType;
  category: BranchCategory;
  capacity?: number;
  operatingHours?: Record<string, any>;
  contactInfo?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;

  address: IAddress;
}
