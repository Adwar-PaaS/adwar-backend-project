import { RoleName, EntityType, ActionType } from '@prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: {
    id: string;
    name: RoleName;
    permissions: { // user permission that allowed
      entity: EntityType;
      action: ActionType;
    }[];
  };
  tenant: {
    id: string | null;
    slug: string | null;
  };
}
