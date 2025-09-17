import { Injectable, BadRequestException } from '@nestjs/common';
import { BranchRepository } from './branch.repository';
import { AddressService } from 'src/shared/address/address.service';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';

@Injectable()
export class BranchService {
  constructor(
    private readonly branchRepo: BranchRepository,
    private readonly addressService: AddressService,
  ) {}

  async create(dto: CreateBranchDto) {
    const branchData: any = {
      name: dto.name,
      status: dto.status,
      type: dto.type,
      category: dto.category,
    };

    if (dto.tenantId) {
      branchData.tenant = { connect: { id: dto.tenantId } };
    }

    if (dto.addressId) {
      branchData.address = { connect: { id: dto.addressId } };
    } else if (dto.address) {
      const address = await this.addressService.create(dto.address);
      branchData.address = { connect: { id: address.id } };
    } else {
      throw new BadRequestException(
        'Either addressId or address object must be provided',
      );
    }

    return this.branchRepo.create(branchData);
  }

  async update(id: string, dto: UpdateBranchDto) {
    const updateData: any = {
      name: dto.name,
      status: dto.status,
      type: dto.type,
      category: dto.category,
    };

    if (dto.tenantId) {
      updateData.tenant = { connect: { id: dto.tenantId } };
    }

    if (dto.addressId) {
      updateData.address = { connect: { id: dto.addressId } };
    } else if (dto.address) {
      const address = await this.addressService.create(dto.address);
      updateData.address = { connect: { id: address.id } };
    }

    return this.branchRepo.update(id, updateData);
  }

  async findAll(query: Record<string, any>) {
    return this.branchRepo.findAll(query);
  }

  async findOne(id: string) {
    return this.branchRepo.findOne({ id });
  }

  async getTenantBranches(query: Record<string, any>, tenantId: string) {
    return this.branchRepo.findAll(query, { tenantId });
  }

  async delete(id: string) {
    return this.branchRepo.delete(id);
  }
}

// function getGoogleMapsLink(lat: number, lng: number): string {
//   return `https://www.google.com/maps?q=${lat},${lng}`;
// }

// return {
//   ...branch,
//   mapUrl: branch.address?.latitude && branch.address?.longitude
//     ? getGoogleMapsLink(branch.address.latitude.toNumber(), branch.address.longitude.toNumber())
//     : null,
// };
