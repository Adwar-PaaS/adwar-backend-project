import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../db/prisma/prisma.service';
import { RoleName } from '@prisma/client';
import { getEntityActionsMap } from '../../common/utils/entity-actions-map.util';

@Injectable()
export class PermissionService {
  constructor(private readonly prisma: PrismaService) {}

  getEntitiesWithActions() {
    return getEntityActionsMap();
  }

  getAllRolesExcludingSuperAdmin() {
    return Object.values(RoleName).filter(
      (role) => role !== RoleName.SUPER_ADMIN,
    );
  }
}
