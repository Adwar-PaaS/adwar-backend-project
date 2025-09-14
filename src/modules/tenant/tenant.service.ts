import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantRepository } from './tenant.repository';
import { ITenant } from './interfaces/tenant.interface';
import { UploadService } from '../../shared/upload/upload.service';
import { Status } from '@prisma/client';
import { AddressService } from 'src/shared/address/address.service';
import slugify from 'slugify';
import { checkUnique } from '../../common/utils/check-unique.util';
import { PrismaService } from 'src/db/prisma/prisma.service';
import { RolesRepository } from '../role/roles.repository';

@Injectable()
export class TenantService {
  constructor(
    private readonly tenantRepo: TenantRepository,
    private readonly uploadService: UploadService,
    private readonly addressService: AddressService,
    private readonly prismaService: PrismaService,
    private readonly rolesRepo: RolesRepository,
  ) {}

  async create(
    dto: CreateTenantDto,
    creatorId: string,
    file?: Express.Multer.File,
  ): Promise<ITenant> {
    const logoUrl = file
      ? await this.uploadService.uploadImage(file)
      : dto.logoUrl;

    const slug = slugify(dto.name, { lower: true, strict: true });

    await checkUnique(this.prismaService, 'tenant', {
      email: dto.email,
      slug,
    });

    const { logoUrl: _, address, ...cleanDto } = dto;

    const tenantData: any = {
      ...cleanDto,
      logoUrl,
      slug,
      creatorId,
    };

    if (dto.addressId) {
      tenantData.address = { connect: { id: dto.addressId } };
    } else if (dto.address) {
      const address = await this.addressService.create(dto.address);
      tenantData.address = { connect: { id: address.id } };
    } else {
      throw new BadRequestException(
        'Either addressId or address object must be provided',
      );
    }

    return await this.tenantRepo.create({ data: tenantData });
  }

  async getRolesForTenant(tenantId: string) {
    const { items } = await this.rolesRepo.findAll({}, { tenantId });
    return items;
  }

  findAll(query: Record<string, any>) {
    return this.tenantRepo.findAll(query);
  }

  findById(id: string): Promise<ITenant> {
    return this.tenantRepo.findOne({ id });
  }

  async update(
    id: string,
    dto: UpdateTenantDto,
    file?: Express.Multer.File,
  ): Promise<ITenant> {
    let logoUrl = dto.logoUrl;

    if (file) {
      const existing = await this.tenantRepo.findOne({ id });
      if (existing.logoUrl) {
        await this.uploadService.deleteFile(existing.logoUrl);
      }
      logoUrl = await this.uploadService.uploadImage(file);
    }

    const { logoUrl: _, address, ...cleanDto } = dto;

    const updateData: any = {
      ...cleanDto,
      logoUrl,
    };

    if (dto.addressId) {
      updateData.address = { connect: { id: dto.addressId } };
    } else if (dto.address) {
      const address = await this.addressService.create(dto.address);
      updateData.address = { connect: { id: address.id } };
    }

    return await this.tenantRepo.update(id, updateData);
  }

  async toggleStatus(id: string): Promise<ITenant> {
    const existing = await this.tenantRepo.findOne({ id });

    const newStatus =
      existing.status === Status.ACTIVE ? Status.INACTIVE : Status.ACTIVE;

    return this.tenantRepo.update(id, { status: newStatus });
  }

  async getTenantUsers(query: Record<string, any>, tenantId: string) {
    return this.tenantRepo.findAll({ ...query, tenantId });
  }

  async delete(id: string): Promise<void> {
    return this.tenantRepo.delete(id);
  }
}
