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
      const addressesWithUserId = dto.addresses.map((addr) => ({
        ...addr,
        userId: user.id,
      }));
      await this.addressService.createMany(addressesWithUserId);
    }

    return this.usersRepo.findOne({ id: user.id });
  }

  findAll(query: Record<string, any>) {
    return this.usersRepo.findAll(query);
  }

  findById(id: string) {
    return this.usersRepo.findOne({ id });
  }

  async update(id: string, dto: UpdateUserDto) {
    if (dto.password) {
      dto.password = await hashPassword(dto.password);
    }

    const { addresses, ...cleanDto } = dto;

    const user = await this.usersRepo.updateUser(id, cleanDto);

    if (addresses && addresses.length) {
      const updates = addresses.filter((a) => a.id);
      const creates = addresses
        .filter((a) => !a.id)
        .map((a) => ({ ...a, userId: id }));

      if (updates.length) {
        await this.addressService.updateMany(updates);
      }
      if (creates.length) {
        await this.addressService.createMany(creates);
      }
    }

    return this.usersRepo.findOne({ id: user.id });
  }

  async createUserViaSuperAdminWithRole(dto: CreateUserDto) {
    dto.password = await hashPassword(dto.password);

    return this.usersRepo.createUserViaSuperAdminWithRole(dto);
  }

  async createTenantUser(dto: CreateUserDto) {
    dto.password = await hashPassword(dto.password);
    const user = await this.usersRepo.createTenantUser(dto);

    if (dto.addresses?.length) {
      const addressesWithUserId = dto.addresses.map((addr) => ({
        ...addr,
        userId: user.id,
      }));
      await this.addressService.createMany(addressesWithUserId);
    }

    return this.usersRepo.findOne({ id: user.id });
  }

  async delete(id: string): Promise<void> {
    await this.usersRepo.delete(id);
  }

  findByEmail(email: string) {
    return this.usersRepo.findOne({ email });
  }

  async updateStatus(id: string, status: Status) {
    return this.usersRepo.updateStatus(id, status);
  }
}
