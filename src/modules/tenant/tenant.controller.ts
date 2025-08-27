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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { APIResponse } from '../../common/utils/api-response.util';
import { SessionGuard } from '../../modules/auth/guards/session.guard';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { PermissionGuard } from '../../common/guards/permission.guard';

@Controller('tenants')
@UseGuards(SessionGuard, PermissionGuard)
export class TenantController {
  constructor(private readonly service: TenantService) {}

  @Post()
  @UseInterceptors(FileInterceptor('logoUrl'))
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateTenantDto,
    @CurrentUser() user: AuthUser,
  ): Promise<APIResponse<{ tenant: ITenant }>> {
    const tenant = await this.service.create(dto, user.id, file);
    return APIResponse.success({ tenant }, 'Tenant created successfully');
  }

  @Get()
  async findAll(@Query() query: Record<string, any>) {
    const { data, total, page, limit, hasNext, hasPrev } =
      await this.service.findAll(query);

    return {
      statusCode: HttpStatus.OK,
      message: 'Fetched tenants successfully',
      data: {
        tenants: data,
        total,
        page,
        limit,
        hasNext,
        hasPrev,
      },
    };
  }

  @Get(':id')
  async findById(
    @Param('id') id: string,
  ): Promise<APIResponse<{ tenant: ITenant }>> {
    const tenant = await this.service.findById(id);
    return APIResponse.success({ tenant }, 'Tenant retrieved successfully');
  }

  @Get(':id/users')
  async getTenantUsers(
    @Param('id') id: string,
  ): Promise<APIResponse<{ users: any[] }>> {
    const users = await this.service.getUsersInTenant(id);
    return APIResponse.success({ users }, 'Tenant users fetched successfully');
  }

  @Get(':id/roles')
  async getTenantRoles(
    @Param('id') id: string,
  ): Promise<APIResponse<{ roles: any[] }>> {
    const roles = await this.service.getRolesForTenant(id);
    return APIResponse.success({ roles }, 'Tenant roles fetched successfully');
  }

  @Get(':id/warehouses')
  async getTenantWarehouses(
    @Param('id') id: string,
  ): Promise<APIResponse<{ warehouses: any[] }>> {
    const warehouses = await this.service.getWarehousesInTenant(id);
    return APIResponse.success(
      { warehouses },
      'Tenant warehouses fetched successfully',
    );
  }

  @Get(':id/orders')
  async getTenantOrders(
    @Param('id') id: string,
  ): Promise<APIResponse<{ orders: any[] }>> {
    const orders = await this.service.getTenantOrders(id);
    return APIResponse.success(
      { orders },
      'Tenant orders fetched successfully',
    );
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('logoUrl'))
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTenantDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<APIResponse<{ tenant: ITenant }>> {
    const tenant = await this.service.update(id, dto, file);
    return APIResponse.success({ tenant }, 'Tenant updated successfully');
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
  ): Promise<APIResponse<{ tenant: ITenant }>> {
    const tenant = await this.service.toggleStatus(id);
    return APIResponse.success(
      { tenant },
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
