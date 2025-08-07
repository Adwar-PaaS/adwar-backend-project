import { Role } from '@prisma/client';

export interface IUser {
  id: string;
  email: string;
  password: string;
  fullName: string;
  phone: string | null;
  role: Role;
  tenantId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
