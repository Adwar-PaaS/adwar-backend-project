import { RoleName, EntityType, ActionType } from '@prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  isOwner?: boolean;
  role: {
    id: string;
    name: RoleName;
    permissions: {
      entity: EntityType;
      action: ActionType;
    }[];
  };
  tenant: {
    id: string | null;
    slug: string | null;
  };
}
