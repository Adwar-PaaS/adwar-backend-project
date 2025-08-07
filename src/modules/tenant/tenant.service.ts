import { Injectable } from '@nestjs/common';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantRepository } from './tenant.repository';
import { ITenant } from './interfaces/tenant.interface';
import { UploadService } from '../../shared/upload/upload.service';

@Injectable()
export class TenantService {
  constructor(
    private readonly repo: TenantRepository,
    private readonly uploadService: UploadService,
  ) {}

  async create(
    dto: CreateTenantDto,
    createdBy: string,
    file?: Express.Multer.File,
  ): Promise<ITenant> {
    let logoUrl: string | undefined;

    if (file) {
      logoUrl = await this.uploadService.uploadImage(file);
    }

    const { logo, ...cleanDto } = dto;

    return this.repo.create({
      ...cleanDto,
      logoUrl,
      createdBy,
    });
  }

  findAll(): Promise<ITenant[]> {
    return this.repo.findAll();
  }

  findById(id: string): Promise<ITenant> {
    return this.repo.findById(id);
  }

  async update(
    id: string,
    dto: UpdateTenantDto,
    file?: Express.Multer.File,
  ): Promise<ITenant> {
    let logoUrl = dto.logo;

    if (file) {
      const existing = await this.repo.findById(id);
      if (existing.logoUrl) {
        await this.uploadService.deleteFile(existing.logoUrl);
      }

      logoUrl = await this.uploadService.uploadImage(file);
    }

    return this.repo.update(id, { ...dto, logoUrl });
  }

  delete(id: string): Promise<ITenant> {
    return this.repo.delete(id);
  }
}
