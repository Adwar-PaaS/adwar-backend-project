import type { Prisma } from '@prisma/client';

export type AuthUser = Prisma.UserGetPayload<{
  include: {
    role: {
      include: {
        permissions: true;
      };
    };
    userTenants: true;
  };
}>;
