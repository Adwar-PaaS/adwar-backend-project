import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersRepository } from './users.repository';
import { hashPassword } from '../../common/utils/crypto.util';
import { AddressService } from 'src/shared/address/address.service';
import { Status } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepo: UsersRepository,
    private readonly addressService: AddressService,
  ) {}

  async create(dto: CreateUserDto) {
    dto.password = await hashPassword(dto.password);
    const user = await this.usersRepo.createUser(dto);

    if (dto.addresses?.length) {
      for (const addr of dto.addresses) {
        const address = await this.addressService.create(addr);
        await this.usersRepo.attachAddressToUser(user.id, address.id, {
          type: addr.type,
          isPrimary: false,
          isDefault: false,
        });
      }
    }

    return user;
  }

  findAll(query: Record<string, any>) {
    return this.usersRepo.findAll(query);
  }

  findById(id: string) {
    return this.usersRepo.findById(id);
  }

  async update(id: string, dto: UpdateUserDto) {
    if (dto.password) {
      dto.password = await hashPassword(dto.password);
    }

    return this.usersRepo.updateUser(id, dto);
  }

  async createUserViaSuperAdminWithRole(dto: CreateUserDto) {
    dto.password = await hashPassword(dto.password);

    return this.usersRepo.createUserViaSuperAdminWithRole(dto);
  }

  async createTenantUser(dto: CreateUserDto) {
    dto.password = await hashPassword(dto.password);

    return this.usersRepo.createTenantUser(dto);
  }

  async delete(id: string): Promise<void> {
    await this.usersRepo.delete(id);
  }

  findByEmail(email: string) {
    return this.usersRepo.getByEmail(email);
  }

  async updateStatus(id: string, status: Status) {
    return this.usersRepo.updateStatus(id, status);
  }
}
