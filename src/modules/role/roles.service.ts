import { Injectable } from '@nestjs/common';
import { RolesRepository } from './roles.repository';
import { EntityType, ActionType } from '@prisma/client';

@Injectable()
export class RolesService {
  constructor(private readonly rolesRepo: RolesRepository) {}

  async addPermissionsToRole(
    roleId: string,
    permissions: { entityType: EntityType; actionTypes: ActionType[] }[],
  ) {
    return this.rolesRepo.addPermissionsToRole(roleId, permissions);
  }

  async findAll() {
    return this.rolesRepo.findAllRolesWithoutSuperAdmin();
  }

  async getRoleById(id: string) {
    return this.rolesRepo.findById(id);
  }

  async deleteRole(id: string) {
    return this.rolesRepo.deleteRole(id);
  }
}
