import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../db/prisma/prisma.service';
import { Tenant, Status } from '@prisma/client';
import { BaseRepository } from '../../shared/factory/base.repository';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { checkEmailUnique } from '../../common/utils/check-email.util';
import slugify from 'slugify';

type CreateTenantInput = Omit<CreateTenantDto, 'logo'> & {
  logoUrl?: string;
  createdBy: string;
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
    const { createdBy, ...rest } = tenant;
    return {
      ...rest,
      creator: createdBy ? { fullName: createdBy.fullName } : null,
    };
  }

  async createTenant(data: CreateTenantInput): Promise<any> {
    await checkEmailUnique(this.prismaService, 'tenant', data.email);

    const { createdBy, ...rest } = data;

    const tenant = await this.model.create({
      data: {
        ...rest,
        slug: slugify(data.name, { lower: true, strict: true }),
        status: data.status ?? Status.ACTIVE,
        createdBy: { connect: { id: createdBy } },
      },
      include: { createdBy: { select: { fullName: true } } },
    });

    return this.mapToCreator(tenant);
  }

  async getTenantUsers(tenantId: string) {
    const tenant = await this.model.findUnique({
      where: { id: tenantId },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                fullName: true,
                phone: true,
                status: true,
                role: true,
                createdAt: true,
              },
            },
            warehouse: {
              select: {
                id: true,
                name: true,
                location: true,
              },
            },
          },
        },
      },
    });

    if (!tenant) throw new NotFoundException('Tenant not found');

    return tenant.memberships.map((m: { user: any; warehouse: any }) => ({
      user: m.user,
      warehouse: m.warehouse,
    }));
  }

  async getTenantRoles(tenantId: string) {
    const tenant = await this.model.findUnique({
      where: { id: tenantId },
      include: {
        memberships: {
          include: {
            user: {
              include: {
                role: {
                  select: {
                    id: true,
                    name: true,
                    createdAt: true,
                    updatedAt: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!tenant) throw new NotFoundException('Tenant not found');

    const rolesMap = new Map<string, any>();
    for (const membership of tenant.memberships) {
      if (membership.user?.role) {
        rolesMap.set(membership.user.role.id, membership.user.role);
      }
    }

    return Array.from(rolesMap.values());
  }

  async findAllWithCreator(queryString: Record<string, any>) {
    const result = await this.findAll(
      queryString,
      {},
      { createdBy: { select: { fullName: true } } },
    );
    return {
      ...result,
      data: result.data.map((tenant: any) => this.mapToCreator(tenant)),
    };
  }

  async getById(id: string): Promise<any> {
    const tenant = await this.model.findUnique({
      where: { id },
      include: { createdBy: { select: { fullName: true } } },
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
      include: { createdBy: { select: { fullName: true } } },
    });

    return this.mapToCreator(tenant);
  }

  async updateStatus(id: string, status: Status): Promise<any> {
    const tenant = await this.model.update({
      where: { id },
      data: { status },
      include: { createdBy: { select: { fullName: true } } },
    });

    return this.mapToCreator(tenant);
  }

  async deleteTenant(id: string): Promise<Tenant> {
    return this.model.delete({ where: { id } });
  }
}
