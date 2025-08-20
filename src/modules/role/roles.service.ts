import { Injectable } from '@nestjs/common';
import { RolesRepository } from './roles.repository';
import { CreateRoleDto } from './dto/create-role.dto';

@Injectable()
export class RolesService {
  constructor(private readonly rolesRepo: RolesRepository) {}

  async createRole(dto: CreateRoleDto) {
    return this.rolesRepo.createRoleWithPermissions(dto);
  }

  async getRoleById(id: string) {
    return this.rolesRepo.findById(id);
  }

  async deleteRole(id: string) {
    return this.rolesRepo.deleteRole(id);
  }
}
