import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../db/prisma/prisma.service';
import { Tenant, Status, UserTenant } from '@prisma/client';
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

const creatorSelect = { creator: { select: { fullName: true } } };

@Injectable()
export class TenantRepository extends BaseRepository<Tenant> {
  constructor(private readonly prismaService: PrismaService) {
    super(prismaService, prismaService.tenant, ['name', 'email']);
  }

  async createTenant(data: CreateTenantInput): Promise<Tenant> {
    await checkEmailUnique(this.prismaService, 'tenant', data.email);

    const { createdBy, ...rest } = data;

    return this.model.create({
      data: {
        ...rest,
        slug: slugify(data.name, { lower: true, strict: true }),
        status: data.status ?? Status.Activate,
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
            status: true,
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

  async findAllWithCreator(queryString: Record<string, any>) {
    return this.findAll(queryString, {}, creatorSelect);
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

  async updateStatus(id: string, status: Status): Promise<Tenant> {
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
