import { Role, UserStatus } from '@prisma/client';

export interface IUser {
  id: string;
  email: string;
  password?: string;
  fullName: string;
  phone: string | null;
  status: UserStatus;
  role: Role;
  tenantId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
