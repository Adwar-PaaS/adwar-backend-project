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
          isPrimary: addr.isPrimary,
          isDefault: addr.isDefault,
        });
      }
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
      for (const addr of addresses) {
        if (addr.id) {
          await this.addressService.update(addr.id, addr);
        } else {
          const newAddress = await this.addressService.create(addr);
          await this.usersRepo.attachAddressToUser(user.id, newAddress.id, {
            type: addr.type,
            isPrimary: addr.isPrimary,
            isDefault: addr.isDefault,
          });
        }
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
      for (const addr of dto.addresses) {
        const address = await this.addressService.create(addr);
        await this.usersRepo.attachAddressToUser(user.id, address.id, {
          type: addr.type,
          isPrimary: addr.isPrimary,
          isDefault: addr.isDefault,
        });
      }
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
