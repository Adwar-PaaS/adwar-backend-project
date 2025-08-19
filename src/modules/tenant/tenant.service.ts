import { Injectable } from '@nestjs/common';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantRepository } from './tenant.repository';
import { ITenant } from './interfaces/tenant.interface';
import { UploadService } from '../../shared/upload/upload.service';
import { Status } from '@prisma/client';

@Injectable()
export class TenantService {
  constructor(
    private readonly tenantRepo: TenantRepository,
    private readonly uploadService: UploadService,
  ) {}

  async create(
    dto: CreateTenantDto,
    createdBy: string,
    file?: Express.Multer.File,
  ): Promise<ITenant> {
    const logoUrl = file
      ? await this.uploadService.uploadImage(file)
      : dto.logoUrl;

    const { logoUrl: _, ...cleanDto } = dto;

    return this.tenantRepo.createTenant({
      ...cleanDto,
      logoUrl,
      createdBy,
    });
  }

  findAll(query: Record<string, any>) {
    return this.tenantRepo.findAllWithCreator(query);
  }

  findById(id: string): Promise<ITenant> {
    return this.tenantRepo.getById(id);
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

    const { logoUrl: _, ...cleanDto } = dto;

    return this.tenantRepo.updateTenant(id, {
      ...cleanDto,
      logoUrl,
    });
  }

  async toggleStatus(id: string): Promise<ITenant> {
    const existing = await this.tenantRepo.getById(id);

    const newStatus =
      existing.status === Status.Activate
        ? Status.Deactivate
        : Status.Activate;

    return this.tenantRepo.updateStatus(id, newStatus);
  }

  async getUsersInTenant(tenantId: string) {
    return this.tenantRepo.getTenantUsers(tenantId);
  }

  delete(id: string): Promise<ITenant> {
    return this.tenantRepo.deleteTenant(id);
  }
}
