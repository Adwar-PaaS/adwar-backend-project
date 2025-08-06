import { Injectable, HttpStatus, Logger } from '@nestjs/common';
import { PrismaService } from '../../db/prisma/prisma.service';
import { UploadService } from '../../shared/upload/upload.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantStatus } from '../../common/enums/tenant-status.enum';
import { APIResponse } from '../../common/utils/api-response.util';
import { ApiError } from '../../common/exceptions/api-error.exception';
import { createResponseShape } from '../../common/utils/response-shape.util';
import { PaginationOptions } from '../../common/interfaces/pagination-options.interface';
import { buildPrismaPagination } from '../../common/utils/prisma-pagination.util';
import { PaginationUtil } from '../../common/utils/pagination.util';

@Injectable() // login tenant history
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  private readonly responseFields = {
    base: ['id', 'name', 'logoUrl', 'status', 'address', 'createdAt'] as const,
    extended: ['updatedAt', 'lastLogin'] as const,
  };

  async create(
    dto: CreateTenantDto,
    userId: string,
    logo?: Express.Multer.File,
  ) {
    let logoUrl: string | null = null;

    try {
      logoUrl = await this.uploadLogo(logo);

      const tenant = await this.prisma.tenant.create({
        data: {
          ...dto,
          status: dto.status ?? TenantStatus.ACTIVATE,
          logoUrl,
          createdBy: userId,
        },
      });

      return this.success(
        tenant,
        this.responseFields.base,
        'Tenant created successfully',
        HttpStatus.CREATED,
      );
    } catch (error) {
      this.logger.error('Failed to create tenant', error.stack);
      await this.tryDeleteLogo(logoUrl);
      throw new ApiError(
        'Failed to create tenant',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error.message,
        { stack: error.stack },
      );
    }
  }

  async list(options: PaginationOptions) {
    const { page, limit } = PaginationUtil.sanitize(
      options.page,
      options.limit,
    );
    const pagination = buildPrismaPagination({
      ...options,
      searchableFields: ['name', 'address'],
    });

    const [tenants, total] = await this.prisma.$transaction([
      this.prisma.tenant.findMany(pagination),
      this.prisma.tenant.count({ where: pagination.where }),
    ]);

    const result = PaginationUtil.offset(tenants, total, page, limit);
    return APIResponse.success(result, 'Tenants fetched successfully');
  }

  async findOne(id: string) {
    const tenant = await this.findByIdOrThrow(id);
    return this.success(
      tenant,
      [...this.responseFields.base, ...this.responseFields.extended],
      'Tenant details fetched',
    );
  }

  async update(id: string, dto: UpdateTenantDto, logo?: Express.Multer.File) {
    const tenant = await this.findByIdOrThrow(id);
    const oldLogo = tenant.logoUrl;
    let newLogo: string | null = null;

    try {
      newLogo = await this.uploadLogo(logo, oldLogo);

      const updatedTenant = await this.prisma.tenant.update({
        where: { id },
        data: {
          ...dto,
          logoUrl: newLogo,
        },
      });

      if (newLogo && oldLogo && newLogo !== oldLogo) {
        await this.tryDeleteLogo(oldLogo);
      }

      return this.success(
        updatedTenant,
        [...this.responseFields.base, ...this.responseFields.extended],
        'Tenant updated successfully',
      );
    } catch (error) {
      await this.tryDeleteLogo(newLogo, newLogo !== oldLogo);
      throw new ApiError(
        'Failed to update tenant',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }
  }

  async updateStatus(id: string, status: TenantStatus) {
    const tenant = await this.findByIdOrThrow(id);

    if (tenant.status === status) {
      return this.success(
        { id: tenant.id, status },
        ['id', 'status'],
        'Tenant status unchanged',
      );
    }

    const updated = await this.prisma.tenant.update({
      where: { id },
      data: { status },
    });

    return this.success(
      updated,
      ['id', 'status'],
      `Tenant status updated to ${status}`,
    );
  }

  async remove(id: string) {
    const tenant = await this.findByIdOrThrow(id);

    try {
      await this.prisma.tenant.delete({ where: { id } });

      await this.tryDeleteLogo(tenant.logoUrl);

      return APIResponse.success(
        { id: tenant.id, name: tenant.name },
        'Tenant deleted successfully',
      );
    } catch (error) {
      this.logger.error(`Failed to delete tenant ${id}`, error.stack);
      throw new ApiError(
        'Failed to delete tenant',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }
  }

  private async uploadLogo(
    logo?: Express.Multer.File,
    existing?: string | null,
  ): Promise<string | null> {
    if (!logo) return existing ?? null;

    try {
      return await this.uploadService.uploadImage(logo);
    } catch (error) {
      this.logger.error('Logo upload failed', error.stack);
      throw new ApiError('Logo upload failed', HttpStatus.BAD_REQUEST, error);
    }
  }

  private async tryDeleteLogo(url?: string | null, condition = true) {
    if (!url || !condition) return;

    try {
      await this.uploadService.deleteFile(url);
    } catch (error) {
      this.logger.warn(`Failed to delete logo: ${url}`, error.stack);
    }
  }

  private async findByIdOrThrow(id: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: { creator: { select: { id: true, fullName: true } } },
    });

    if (!tenant) {
      throw new ApiError('Tenant not found', HttpStatus.NOT_FOUND);
    }

    return tenant;
  }

  private success<T extends Record<string, any>, K extends keyof T>(
    model: T,
    fields: readonly K[],
    message: string,
    statusCode = HttpStatus.OK,
  ) {
    return APIResponse.success(
      createResponseShape(model, fields),
      message,
      statusCode,
    );
  }
}
