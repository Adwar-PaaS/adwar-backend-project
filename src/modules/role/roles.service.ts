import { Injectable } from '@nestjs/common';
import { RolesRepository } from './roles.repository';
import { EntityType, ActionType, RoleName } from '@prisma/client';

@Injectable()
export class RolesService {
  constructor(private readonly rolesRepo: RolesRepository) {}

  async createRoleWithPermissions(
    name: RoleName,
    tenantId: string | null,
    permissions: { entityType: EntityType; actionTypes: ActionType[] }[],
  ) {
    return this.rolesRepo.createRoleWithPermissions(
      name,
      tenantId,
      permissions,
    );
  }

  async getRoleById(id: string) {
    return this.rolesRepo.findById(id);
  }

  async deleteRole(id: string) {
    return this.rolesRepo.deleteRole(id);
  }
}
