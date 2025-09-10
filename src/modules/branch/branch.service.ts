import { Injectable } from '@nestjs/common';
import { BranchRepository } from './branch.repository';

@Injectable()
export class BranchService {
  constructor(private readonly branchRepo: BranchRepository) {}

  async create(dto: any) {
    return this.branchRepo.create(dto);
  }

  async update(id: string, dto: any) {
    return this.branchRepo.update(id, dto);
  }

  async findAll(query: Record<string, any>) {
    return this.branchRepo.findAll(query);
  }

  async findOne(id: string) {
    return this.branchRepo.findOne({ id });
  }

  async getCustomerBranches(customerId: string) {
    return this.branchRepo.getCustomerBranches(customerId);
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
