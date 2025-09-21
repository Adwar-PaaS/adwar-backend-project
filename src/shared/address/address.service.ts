import { Injectable, NotFoundException } from '@nestjs/common';
import { AddressRepository } from './address.repository';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { Address, Prisma } from '@prisma/client';

@Injectable()
export class AddressService {
  constructor(private readonly addressRepo: AddressRepository) {}

  async create(dto: CreateAddressDto): Promise<Address> {
    const { type, isPrimary, isDefault, userId, ...addressData } = dto;

    const latitude =
      dto.latitude !== undefined ? new Prisma.Decimal(dto.latitude) : undefined;
    const longitude =
      dto.longitude !== undefined
        ? new Prisma.Decimal(dto.longitude)
        : undefined;

    const address = await this.addressRepo.create({
      ...addressData,
      latitude,
      longitude,
    });

    if (userId) {
      await this.addressRepo.attachToUser(userId, address.id, {
        type,
        isPrimary,
        isDefault,
      });
    }

    return address;
  }

  async createMany(dtos: CreateAddressDto[]): Promise<Address[]> {
    if (!dtos.length) return [];
    return Promise.all(dtos.map((dto) => this.create(dto)));
  }

  async update(id: string, dto: UpdateAddressDto): Promise<Address> {
    const { type, isPrimary, isDefault, userId, ...updateData } = dto;

    const latitude =
      dto.latitude !== undefined ? new Prisma.Decimal(dto.latitude) : undefined;
    const longitude =
      dto.longitude !== undefined
        ? new Prisma.Decimal(dto.longitude)
        : undefined;

    const address = await this.addressRepo.update(id, {
      ...updateData,
      latitude,
      longitude,
    });

    if (
      userId &&
      (type !== undefined || isPrimary !== undefined || isDefault !== undefined)
    ) {
      const result = await this.addressRepo.updateAttachToUser(userId, id, {
        type,
        isPrimary,
        isDefault,
      });
      if (result.count === 0) {
        throw new NotFoundException('User address attachment not found');
      }
    }

    return address;
  }

  async updateMany(dtos: UpdateAddressDto[]): Promise<Address[]> {
    if (!dtos.length) return [];

    return Promise.all(dtos.map((dto) => this.update(dto.id!, dto)));
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
