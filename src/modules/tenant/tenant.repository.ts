import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../db/prisma/prisma.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { ITenant } from './interfaces/tenant.interface';
import { TenantStatus } from '@prisma/client';

type CreateTenantInput = Omit<CreateTenantDto, 'logo'> & {
  logoUrl?: string;
  createdBy: string;
};

type UpdateTenantInput = UpdateTenantDto & { logoUrl?: string };

@Injectable()
export class TenantRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateTenantInput): Promise<ITenant> {
    const { createdBy, status, ...rest } = data;

    return this.prisma.tenant.create({
      data: {
        ...rest,
        status: status ?? TenantStatus.Activate,
        creator: { connect: { id: createdBy } },
      },
      include: { creator: { select: { fullName: true } } },
    });
  }

  async findAll(): Promise<ITenant[]> {
    return this.prisma.tenant.findMany({
      include: {
        creator: {
          select: {
            fullName: true,
          },
        },
      },
    });
  }

  async findById(id: string): Promise<ITenant> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            fullName: true,
          },
        },
      },
    });

    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async update(id: string, data: UpdateTenantInput): Promise<ITenant> {
    return this.prisma.tenant.update({
      where: { id },
      data,
      include: {
        creator: { select: { fullName: true } },
      },
    });
  }

  async updateStatus(id: string, status: TenantStatus): Promise<ITenant> {
    return this.prisma.tenant.update({
      where: { id },
      data: { status },
      include: {
        creator: { select: { fullName: true } },
      },
    });
  }

  async delete(id: string): Promise<ITenant> {
    return this.prisma.tenant.delete({ where: { id } });
  }
}
