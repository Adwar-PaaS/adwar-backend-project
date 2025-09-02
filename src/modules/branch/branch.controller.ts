import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
} from '@nestjs/common';
import { BranchService } from './branch.service';
import { APIResponse } from '../../common/utils/api-response.util';
import { Permissions } from '../../common/decorators/permission.decorator';
import { EntityType, ActionType } from '@prisma/client';
import { SessionGuard } from '../../modules/auth/guards/session.guard';
import { UseGuards } from '@nestjs/common';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { Audit } from 'src/common/decorators/audit.decorator';
import { PaginationResult } from '../../common/utils/api-features.util';

@Controller('warehouses')
@UseGuards(SessionGuard, PermissionGuard)
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  @Post()
  @Permissions(EntityType.WAREHOUSE, ActionType.CREATE)
  @Audit({
    entityType: EntityType.WAREHOUSE,
    actionType: ActionType.CREATE,
    description: 'Created a new warehouse',
  })
  async create(@Body() dto: CreateBranchDto) {
    const warehouse = await this.branchService.create(dto);
    return APIResponse.success(
      { warehouse },
      'Warehouse created successfully',
      HttpStatus.CREATED,
    );
  }

  @Get()
  @Permissions(EntityType.WAREHOUSE, ActionType.READ)
  async findAll(
    @Query() query: Record<string, any>,
  ): Promise<APIResponse<{ warehouses: any[] } & Partial<PaginationResult>>> {
    const { items, ...pagination } = await this.branchService.findAll(query);
    return APIResponse.success(
      { warehouses: items, ...pagination },
      'Fetched tenants successfully',
      HttpStatus.OK,
    );
  }

  @Get(':id')
  @Permissions(EntityType.WAREHOUSE, ActionType.READ)
  async findOne(@Param('id') id: string) {
    const warehouse = await this.branchService.findOne(id);
    return APIResponse.success(
      { warehouse },
      'Warehouse retrieved successfully',
    );
  }

  @Put(':id')
  @Permissions(EntityType.WAREHOUSE, ActionType.UPDATE)
  @Audit({
    entityType: EntityType.WAREHOUSE,
    actionType: ActionType.UPDATE,
    entityIdParam: 'id',
    description: 'Updated a warehouse',
  })
  async update(@Param('id') id: string, @Body() dto: UpdateBranchDto) {
    const warehouse = await this.branchService.update(id, dto);
    return APIResponse.success({ warehouse }, 'Warehouse updated successfully');
  }

  @Delete(':id')
  @Permissions(EntityType.WAREHOUSE, ActionType.DELETE)
  async delete(@Param('id') id: string) {
    await this.branchService.delete(id);
    return APIResponse.success(
      null,
      'Warehouse deleted successfully',
      HttpStatus.NO_CONTENT,
    );
  }
}
