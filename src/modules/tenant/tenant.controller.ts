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
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { APIResponse } from '../../common/utils/api-response.util';
import { SessionGuard } from '../../modules/auth/guards/session.guard';
import { AuthUser } from '../auth/interfaces/auth-user.interface';

@Controller('tenants')
@UseGuards(SessionGuard, RolesGuard)
export class TenantController {
  constructor(private readonly service: TenantService) {}

  @Post()
  @Roles(Role.SUPERADMIN)
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
  @Roles(Role.SUPERADMIN)
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

  @Put(':id')
  @Roles(Role.SUPERADMIN)
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
  @Roles(Role.SUPERADMIN)
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
  @Roles(Role.SUPERADMIN)
  async delete(@Param('id') id: string): Promise<APIResponse<null>> {
    await this.service.delete(id);
    return APIResponse.success(
      null,
      'Tenant deleted successfully',
      HttpStatus.NO_CONTENT,
    );
  }
}
