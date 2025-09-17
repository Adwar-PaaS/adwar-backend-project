import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Patch,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  Query,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { TenantService } from './tenant.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { ITenant } from './interfaces/tenant.interface';
import {
  mapTenantView,
  mapTenantViews,
  TenantView,
} from './mappers/tenant.mapper';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { APIResponse } from '../../common/utils/api-response.util';
import { PaginationResult } from '../../common/utils/api-features.util';
import { SessionGuard } from '../../modules/auth/guards/session.guard';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { BranchService } from '../branch/branch.service';
import { IBranch } from '../branch/interfaces/branch.interface';
import { IOrder } from '../order/interfaces/order.interface';
import { OrderService } from '../order/order.service';

@Controller('tenants')
@UseGuards(SessionGuard, PermissionGuard)
export class TenantController {
  constructor(
    private readonly service: TenantService,
    private readonly branchService: BranchService,
    private readonly orderService: OrderService,
  ) {}

  @Post()
  @UseInterceptors(FileInterceptor('logoUrl'))
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateTenantDto,
    @CurrentUser() user: AuthUser,
  ) {
    const tenant = await this.service.create(dto, user.id, file);
    return APIResponse.success({ tenant }, 'Tenant created successfully');
  }

  @Get()
  async findAll(
    @Query() query: Record<string, any>,
  ): Promise<
    APIResponse<{ tenants: TenantView[] } & Partial<PaginationResult>>
  > {
    const { items, ...pagination } = await this.service.findAll(query);
    const tenants = mapTenantViews(items as unknown as ITenant[]);
    return APIResponse.success(
      { tenants, ...pagination },
      'Fetched tenants successfully',
      HttpStatus.OK,
    );
  }

  @Get(':id')
  async findById(
    @Param('id') id: string,
  ): Promise<APIResponse<{ tenant: TenantView }>> {
    const tenant = await this.service.findById(id);
    return APIResponse.success(
      { tenant: mapTenantView(tenant as ITenant) },
      'Tenant retrieved successfully',
    );
  }

  @Get(':id/users')
  async getTenantUsers(
    @Query() query: Record<string, any>,
    @Param('id') id: string,
  ): Promise<APIResponse<{ users: any[] } & Partial<PaginationResult>>> {
    const { items, ...pagination } = await this.service.getTenantUsers(
      query,
      id,
    );

    return APIResponse.success(
      { users: items, ...pagination },
      'Tenant users fetched successfully',
    );
  }

  @Get(':id/roles')
  async getTenantRoles(
    @Param('id') id: string,
  ): Promise<APIResponse<{ roles: any[] }>> {
    const roles = await this.service.getRolesForTenant(id);
    return APIResponse.success({ roles }, 'Tenant roles fetched successfully');
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('logoUrl'))
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTenantDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<APIResponse<{ tenant: TenantView }>> {
    const tenant = await this.service.update(id, dto, file);
    return APIResponse.success(
      { tenant: mapTenantView(tenant as ITenant) },
      'Tenant updated successfully',
    );
  }

  @Get(':tenantId/branches')
  async getTenantBranches(
    @Query() query: Record<string, any>,
    @Param('tenantId') tenantId: string,
  ): Promise<APIResponse<{ branches: IBranch[] } & Partial<PaginationResult>>> {
    const { items, ...pagination } = await this.branchService.getTenantBranches(
      query,
      tenantId,
    );
    return APIResponse.success(
      { branches: items, ...pagination },
      'Tenant branches fetched successfully',
      HttpStatus.OK,
    );
  }

  @Get(':tenantId/orders')
  async getTenantOrders(
    @Query() query: Record<string, any>,
    @Param('tenantId') tenantId: string,
  ): Promise<APIResponse<{ orders: IOrder[] } & Partial<PaginationResult>>> {
    const { items, ...pagination } = await this.orderService.getTenantOrders(
      query,
      tenantId,
    );
    return APIResponse.success(
      { orders: items, ...pagination },
      'Tenant orders fetched successfully',
      HttpStatus.OK,
    );
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
  ): Promise<APIResponse<{ tenant: TenantView }>> {
    const tenant = await this.service.toggleStatus(id);
    return APIResponse.success(
      { tenant: mapTenantView(tenant as ITenant) },
      `Tenant status updated to ${tenant.status}`,
    );
  }

  @Delete(':id')
  async delete(@Param('id') id: string): Promise<APIResponse<null>> {
    await this.service.delete(id);
    return APIResponse.success(
      null,
      'Tenant deleted successfully',
      HttpStatus.NO_CONTENT,
    );
  }
}
