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
    if (dto.address && dto.addressId) {
      throw new BadRequestException(
        'Provide either addressId or address details, not both',
      );
    }

    let addressId = dto.addressId;

    if (dto.address) {
      const address = await this.addressService.create(dto.address);
      addressId = address.id;
    }

    return this.branchRepo.create({
      ...dto,
      addressId,
    });
  }

  async update(id: string, dto: UpdateBranchDto) {
    return this.branchRepo.update(id, dto);
  }

  async findAll(query: Record<string, any>) {
    return this.branchRepo.findAll(query);
  }

  async findOne(id: string) {
    return this.branchRepo.findOne({ id });
  }

  async getCustomerBranches(query: Record<string, any>, customerId: string) {
    return this.branchRepo.findAll({ ...query, customerId });
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
