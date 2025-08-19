import { Status, RoleName } from '@prisma/client';

export interface IUser {
  id: string;
  email: string;
  password?: string;
  fullName: string;
  phone: string | null;
  status: Status;

  roleId: string;

  userTenants?: {
    tenantId: string;
    isOwner: boolean;
  }[];

  role?: {
    id: string;
    name: RoleName;
    permissions?: {
      entity: string;
      action: string;
    }[];
  };

  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}
