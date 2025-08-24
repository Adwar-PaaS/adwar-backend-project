import { Status, RoleName, ActionType, EntityType } from '@prisma/client';

export interface IUser {
  id: string;
  email: string;
  password?: string;
  fullName: string;
  phone: string | null;
  status: Status;

  roleId: string;

  memberships?: {
    tenantId: string;
    isOwner: boolean;
    warehouseId?: string | null;
  }[];

  role?: {
    id: string;
    name: RoleName;
    permissions?: {
      entityType: EntityType;
      actionType: ActionType | ActionType[];
    }[];
  };

  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}
