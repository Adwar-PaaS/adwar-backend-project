import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../db/prisma/prisma.service';
import { Tenant, Status } from '@prisma/client';
import { BaseRepository } from '../../shared/factory/base.repository';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { checkEmailUnique } from '../../common/utils/check-email.util';
import { userWithRoleSelect } from '../../common/utils/helpers.util';
import { ApiFeatures } from '../../common/utils/api-features.util';
import slugify from 'slugify';

type CreateTenantInput = Omit<CreateTenantDto, 'logo'> & {
  logoUrl?: string;
  creatorId: string;
};
type UpdateTenantInput = UpdateTenantDto & {
  logoUrl?: string;
  slug?: string;
};

@Injectable()
export class TenantRepository extends BaseRepository<Tenant> {
  constructor(private readonly prismaService: PrismaService) {
    super(prismaService, prismaService.tenant, ['name', 'email']);
  }

  private mapToCreator(tenant: any) {
    if (!tenant) return null;
    const { creator, ...rest } = tenant;
    return {
      ...rest,
      creator: creator
        ? { firstName: creator.firstName, lastName: creator.lastName }
        : null,
      address: tenant.address,
    };
  }

  async createTenant(data: CreateTenantInput): Promise<any> {
    await checkEmailUnique(this.prismaService, 'tenant', data.email);

    const { creatorId, ...rest } = data;

    const tenant = await this.model.create({
      data: {
        ...rest,
        slug: slugify(data.name, { lower: true, strict: true }),
        status: data.status ?? Status.ACTIVE,
        creator: { connect: { id: creatorId } },
      },
      include: {
        creator: { select: { firstName: true, lastName: true } },
        address: true,
      },
    });

    return this.mapToCreator(tenant);
  }

  async getTenantUsers(tenantId: string) {
    const tenant = await this.model.findUnique({
      where: { id: tenantId },
      include: {
        memberships: {
          include: {
            user: { select: userWithRoleSelect },
            branch: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!tenant) throw new NotFoundException('Tenant not found');

    return tenant.memberships.map((m: { user: any; branch: any }) => ({
      user: m.user,
      branch: m.branch,
    }));
  }

  async getRolesForTenant(tenantId: string) {
    const roles = await this.prismaService.role.findMany({
      where: { tenantId },
      include: {
        permissions: {
          select: {
            entityType: true,
            actions: true,
          },
        },
      },
    });
    return roles;
  }

  async findAllWithCreator(queryString: Record<string, any>) {
    const result = await this.findAll(
      queryString,
      {},
      {
        creator: { select: { firstName: true, lastName: true } },
        address: true,
      },
    );
    return {
      ...result,
      items: result.items.map((tenant: any) => this.mapToCreator(tenant)),
    };
  }

  async getTenantBranches(tenantId: string) {
    const tenant = await this.model.findUnique({
      where: { id: tenantId },
      include: { branch: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant.branches;
  }

  async getById(id: string): Promise<any> {
    const tenant = await this.model.findUnique({
      where: { id },
      include: {
        creator: { select: { firstName: true, lastName: true } },
        address: true,
      },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return this.mapToCreator(tenant);
  }

  async updateTenant(id: string, data: UpdateTenantInput): Promise<any> {
    if (data.email) {
      await checkEmailUnique(this.prismaService, 'tenant', data.email, id);
    }

    const tenant = await this.model.update({
      where: { id },
      data: {
        ...data,
        ...(data.name && {
          slug: slugify(data.name, { lower: true, strict: true }),
        }),
      },
      include: {
        creator: { select: { firstName: true, lastName: true } },
        address: true,
      },
    });

    return this.mapToCreator(tenant);
  }

  async getTenantOrders(
    tenantId: string,
    queryString: Record<string, any> = {},
  ) {
    const apiFeatures = new ApiFeatures(this.prismaService.order, queryString);

    apiFeatures
      .mergeFilter({
        branch: { tenantId },
      })
      .sort();

    await apiFeatures.paginate();

    apiFeatures.include({
      driver: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          status: true,
        },
      },
      branch: {
        select: {
          id: true,
          name: true,
        },
      },
    });

    const { data, pagination } = await apiFeatures.query();

    return {
      orders: data,
      ...pagination,
    };
  }

  async updateStatus(id: string, status: Status): Promise<any> {
    const tenant = await this.model.update({
      where: { id },
      data: { status },
      include: { creator: { select: { firstName: true, lastName: true } } },
    });

    return this.mapToCreator(tenant);
  }
}
