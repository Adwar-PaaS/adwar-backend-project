import { Injectable, NotFoundException } from '@nestjs/common';
import { AddressRepository } from './address.repository';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { Address, Prisma } from '@prisma/client';

@Injectable()
export class AddressService {
  constructor(private readonly addressRepo: AddressRepository) {}

  async create(dto: CreateAddressDto): Promise<Address> {
    const { type, isPrimary, isDefault, ...addressData } = dto;

    return this.addressRepo.create({
      ...addressData,
      latitude:
        dto.latitude !== undefined
          ? new Prisma.Decimal(dto.latitude)
          : undefined,
      longitude:
        dto.longitude !== undefined
          ? new Prisma.Decimal(dto.longitude)
          : undefined,
    });
  }

  async update(id: string, dto: UpdateAddressDto): Promise<Address> {
    return this.addressRepo.update(id, {
      ...dto,
      latitude:
        dto.latitude !== undefined
          ? new Prisma.Decimal(dto.latitude)
          : undefined,
      longitude:
        dto.longitude !== undefined
          ? new Prisma.Decimal(dto.longitude)
          : undefined,
    });
  }

  async findAll(query: Record<string, any>) {
    return this.addressRepo.findAll(query);
  }

  async findOne(id: string): Promise<Address> {
    const address = await this.addressRepo.findOne({ id });
    if (!address) throw new NotFoundException('Address not found');
    return address;
  }

  async delete(id: string): Promise<void> {
    return this.addressRepo.delete(id);
  }
}
