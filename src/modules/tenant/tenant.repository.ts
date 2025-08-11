import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../db/prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { ITenant } from './interfaces/tenant.interface';
import { TenantStatus } from '@prisma/client';
import { checkEmailUnique } from '../../common/utils/check-email.util';

type CreateTenantInput = Omit<CreateTenantDto, 'logo'> & {
  logoUrl?: string;
  createdBy: string;
};

type UpdateTenantInput = UpdateTenantDto & { logoUrl?: string };

const creatorSelect = { creator: { select: { fullName: true } } };

@Injectable()
export class TenantRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateTenantInput): Promise<ITenant> {
    await checkEmailUnique(this.prisma, 'tenant', data.email);

    const { createdBy, status, ...rest } = data;

    return this.prisma.tenant.create({
      data: {
        ...rest,
        status: status ?? TenantStatus.Activate,
        creator: { connect: { id: createdBy } },
      },
      include: creatorSelect,
    });
  }

  async findAll(): Promise<ITenant[]> {
    return this.prisma.tenant.findMany({
      include: creatorSelect,
    });
  }

  async findById(id: string): Promise<ITenant> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: creatorSelect,
    });

    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async update(id: string, data: UpdateTenantInput): Promise<ITenant> {
    if (data.email) {
      await checkEmailUnique(this.prisma, 'tenant', data.email, id);
    }

    return this.prisma.tenant.update({
      where: { id },
      data,
      include: creatorSelect,
    });
  }

  async updateStatus(id: string, status: TenantStatus): Promise<ITenant> {
    return this.prisma.tenant.update({
      where: { id },
      data: { status },
      include: creatorSelect,
    });
  }

  async delete(id: string): Promise<ITenant> {
    return this.prisma.tenant.delete({
      where: { id },
    });
  }
}
