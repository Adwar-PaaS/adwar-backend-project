import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../db/prisma/prisma.service';
import { Tenant, TenantStatus } from '@prisma/client';
import { BaseRepository } from '../../shared/factory/base.repository';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { checkEmailUnique } from '../../common/utils/check-email.util';
import { ApiFeatures } from '../../common/utils/api-features.util';
import slugify from 'slugify';

type CreateTenantInput = Omit<CreateTenantDto, 'logo'> & {
  logoUrl?: string;
  createdBy: string;
};
type UpdateTenantInput = UpdateTenantDto & {
  logoUrl?: string;
  slug?: string;
};

const creatorSelect = { creator: { select: { fullName: true } } };

@Injectable()
export class TenantRepository extends BaseRepository<Tenant> {
  constructor(private readonly prismaService: PrismaService) {
    super(prismaService, prismaService.tenant, ['name', 'email']);
  }

  async createTenant(data: CreateTenantInput): Promise<Tenant> {
    await checkEmailUnique(this.prismaService, 'tenant', data.email);

    const { createdBy, status, ...rest } = data;

    return this.model.create({
      data: {
        ...rest,
        slug: slugify(data.name, { lower: true, strict: true }),
        status: status ?? TenantStatus.Activate,
        creator: { connect: { id: createdBy } },
      },
      include: creatorSelect,
    });
  }

  async getTenantUsers(tenantId: string) {
    const tenant = await this.model.findUnique({
      where: { id: tenantId },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phone: true,
            role: true,
            createdAt: true,
          },
        },
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant.users;
  }

  async findAllWithCreator(): Promise<Tenant[]> {
    return this.model.findMany({ include: creatorSelect });
  }

  async getById(id: string): Promise<Tenant> {
    const tenant = await this.model.findUnique({
      where: { id },
      include: creatorSelect,
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async updateTenant(id: string, data: UpdateTenantInput): Promise<Tenant> {
    if (data.email) {
      await checkEmailUnique(this.prismaService, 'tenant', data.email, id);
    }

    return this.model.update({
      where: { id },
      data: {
        ...data,
        ...(data.name && {
          slug: slugify(data.name, { lower: true, strict: true }),
        }),
      },
      include: creatorSelect,
    });
  }

  async findAllWithCreatorPagination(queryString: Record<string, any>) {
    const totalRecords = await this.model.count();

    const apiFeatures = new ApiFeatures<Tenant>(
      this.model,
      queryString,
      this.searchableFields,
    )
      .filter()
      .search()
      .sort()
      .limitFields()
      .paginate(totalRecords)
      .include(creatorSelect);

    const { data, pagination } = await apiFeatures.query();

    return {
      data,
      total: pagination?.totalRecords ?? 0,
      page: pagination?.currentPage ?? 1,
      limit: pagination?.limit ?? 0,
      hasNext: pagination?.hasNext ?? false,
      hasPrev: pagination?.hasPrev ?? false,
    };
  }

  async updateStatus(id: string, status: TenantStatus): Promise<Tenant> {
    return this.model.update({
      where: { id },
      data: { status },
      include: creatorSelect,
    });
  }

  async deleteTenant(id: string): Promise<Tenant> {
    return this.model.delete({ where: { id } });
  }
}
