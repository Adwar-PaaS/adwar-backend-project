import { RoleName, EntityType, ActionType } from '@prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: {
    id: string;
    name: RoleName;
    permissions: {
      entity: EntityType;
      actions: ActionType[];
    }[];
  };
  tenant?: {
    id: string | null;
    slug: string | null;
  };
}
