import { Status, RoleName, ActionType, EntityType } from '@prisma/client';

export interface IUser {
  id: string;
  email: string;
  password?: string;
  firstName: string;
  lastName: String;
  phone: string | null;
  status: Status;
  branchId?: string | null;
  tenantId?: string;

  role?: {
    id: string;
    name: RoleName;
    permissions?: {
      // is is user permissions of user we don't need all role permissions
      entityType: EntityType;
      actionType: ActionType | ActionType[];
    }[];
  };
}
