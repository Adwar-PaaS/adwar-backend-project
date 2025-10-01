import { Injectable, BadRequestException } from '@nestjs/common';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantRepository } from './tenant.repository';
import { UploadService } from '../../shared/upload/upload.service';
import { RoleName, Status, Tenant } from '@prisma/client';
import { AddressService } from 'src/shared/address/address.service';
import slugify from 'slugify';
import { checkUnique } from '../../common/utils/check-unique.util';
import { PrismaService } from 'src/db/prisma/prisma.service';
import { RolesRepository } from '../role/roles.repository';
import { UsersRepository } from '../users/users.repository';

@Injectable()
export class TenantService {
  constructor(
    private readonly tenantRepo: TenantRepository,
    private readonly uploadService: UploadService,
    private readonly addressService: AddressService,
    private readonly prismaService: PrismaService,
    private readonly rolesRepo: RolesRepository,
    private readonly userRepo: UsersRepository,
  ) {}

  async create(
    dto: CreateTenantDto,
    creatorId: string,
    file?: Express.Multer.File,
  ): Promise<Tenant> {
    const slug = slugify(dto.name, { lower: true, strict: true });

    await checkUnique(this.prismaService, 'tenant', {
      email: dto.email,
      slug,
    });

    const logoUrl = file
      ? await this.uploadService.uploadImage(file)
      : dto.logoUrl;

    const { logoUrl: _, address, ...cleanDto } = dto;

    const tenantData: any = {
      ...cleanDto,
      logoUrl,
      slug,
      creatorId,
    };

    if (dto.addressId) {
      tenantData.addressId = dto.addressId;
    } else if (dto.address) {
      const address = await this.addressService.create(dto.address);
      tenantData.addressId = address.id;
    } else {
      throw new BadRequestException(
        'Either addressId or address object must be provided',
      );
    }

    return await this.tenantRepo.create(tenantData);
  }

  async getRolesForTenant(tenantId: string) {
    return await this.rolesRepo.findMany({ tenantId });
  }

  findAll(query: Record<string, any>) {
    return this.tenantRepo.findAll(query);
  }

  async findById(id: string): Promise<Tenant> {
    const tenant = await this.tenantRepo.findOne({ id });
    if (!tenant) {
      throw new Error(`Tenant with id ${id} not found`);
    }
    return tenant;
  }

  async update(
    id: string,
    dto: UpdateTenantDto,
    file?: Express.Multer.File,
  ): Promise<Tenant> {
    let logoUrl = dto.logoUrl;

    if (file) {
      const existing = await this.findById(id);
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
      updateData.addressId = dto.addressId;
    } else if (dto.address) {
      const tenant = await this.findById(id);
      if (!tenant?.addressId) {
        throw new BadRequestException('Tenant has no address to update');
      }

      const updatedAddress = await this.addressService.update(
        tenant.addressId,
        dto.address,
      );

      updateData.addressId = updatedAddress.id;
    }

    return await this.tenantRepo.update(id, updateData);
  }

  async toggleStatus(id: string): Promise<Tenant> {
    const existing = await this.findById(id);

    const newStatus =
      existing.status === Status.ACTIVE ? Status.INACTIVE : Status.ACTIVE;

    return this.tenantRepo.update(id, { status: newStatus });
  }

  async getAllOperationsUsers(tenantId: string) {
    return this.userRepo.findMany({
      status: Status.ACTIVE,
      role: { name: RoleName.OPERATION },
      memberships: { some: { tenantId } },
      deletedAt: null,
    });
  }

  async getTenantUsers(query: Record<string, any>, tenantId: string) {
    const { items, ...pagination } = await this.userRepo.findAll(query, {
      memberships: { some: { tenantId } },
    });

    const users = items.map((u: any) => ({
      id: u.id,
      email: u.email,
      firstName: u.firstName,
      lastName: u.lastName,
      phone: u.phone,
      status: u.status,
      avatar: u.avatar ?? null,
      branchId: u.branchId ?? null,
      tenantId: tenantId,
      isVerified: u.isVerified ?? false,
      lastLoginAt: u.lastLoginAt ?? null,
      joinedAt: u.joinedAt,
      role: u.role
        ? {
            id: u.role.id,
            name: u.role.name,
          }
        : null,
    }));

    return { items: users, ...pagination };
  }

  async delete(id: string): Promise<void> {
    return this.tenantRepo.delete(id);
  }
}
