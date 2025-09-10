import { Injectable } from '@nestjs/common';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantRepository } from './tenant.repository';
import { ITenant } from './interfaces/tenant.interface';
import { UploadService } from '../../shared/upload/upload.service';
import { Status } from '@prisma/client';
import { AddressService } from 'src/shared/address/address.service';

@Injectable()
export class TenantService {
  constructor(
    private readonly tenantRepo: TenantRepository,
    private readonly uploadService: UploadService,
    private readonly addressService: AddressService,
  ) {}

  async create(
    dto: CreateTenantDto,
    creatorId: string,
    file?: Express.Multer.File,
  ): Promise<ITenant> {
    const logoUrl = file
      ? await this.uploadService.uploadImage(file)
      : dto.logoUrl;

    const { logoUrl: _, addresses, ...cleanDto } = dto;

    const tenant = await this.tenantRepo.createTenant({
      ...cleanDto,
      logoUrl,
      creatorId,
    });

    if (addresses?.length) {
      await Promise.all(
        addresses.map((addr) =>
          this.addressService.create({
            ...addr,
            tenantId: tenant.id,
          }),
        ),
      );
    }

    return tenant;
  }

  async getRolesForTenant(tenantId: string) {
    return this.tenantRepo.getRolesForTenant(tenantId);
  }

  findAll(query: Record<string, any>) {
    return this.tenantRepo.findAllWithCreator(query);
  }

  findById(id: string): Promise<ITenant> {
    return this.tenantRepo.getById(id);
  }

  async getTenantOrders(tenantId: string, query?: Record<string, any>) {
    return this.tenantRepo.getTenantOrders(tenantId, query);
  }

  async getBranchesOfTenant(tenantId: string) {
    return this.tenantRepo.getTenantBranches(tenantId);
  }

  async update(
    id: string,
    dto: UpdateTenantDto,
    file?: Express.Multer.File,
  ): Promise<ITenant> {
    let logoUrl = dto.logoUrl;

    if (file) {
      const existing = await this.tenantRepo.getById(id);
      if (existing.logoUrl) {
        await this.uploadService.deleteFile(existing.logoUrl);
      }
      logoUrl = await this.uploadService.uploadImage(file);
    }

    const { logoUrl: _, addresses, ...cleanDto } = dto;

    const tenant = await this.tenantRepo.updateTenant(id, {
      ...cleanDto,
      logoUrl,
    });

    if (addresses?.length) {
      await Promise.all(
        addresses.map(async (addr) => {
          if (addr.id) {
            return this.addressService.update(addr.id, addr);
          } else {
            return this.addressService.create({
              ...addr,
              tenantId: tenant.id,
            });
          }
        }),
      );
    }

    return tenant;
  }

  async toggleStatus(id: string): Promise<ITenant> {
    const existing = await this.tenantRepo.getById(id);

    const newStatus =
      existing.status === Status.ACTIVE ? Status.INACTIVE : Status.ACTIVE;

    return this.tenantRepo.updateStatus(id, newStatus);
  }

  async getUsersInTenant(tenantId: string) {
    return this.tenantRepo.getTenantUsers(tenantId);
  }

  async delete(id: string): Promise<void> {
    return this.tenantRepo.delete(id);
  }
}
