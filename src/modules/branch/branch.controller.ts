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
  UseGuards,
} from '@nestjs/common';
import { BranchService } from './branch.service';
import { APIResponse } from '../../common/utils/api-response.util';
import { Permissions } from '../../common/decorators/permission.decorator';
import { EntityType, ActionType, PickUp } from '@prisma/client';
import { SessionGuard } from '../../modules/auth/guards/session.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { CreateBranchDto } from './dto/create-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { Audit } from 'src/common/decorators/audit.decorator';
import { PaginationResult } from '../../common/utils/api-features.util';
import { IBranch } from './interfaces/branch.interface';
import { PickUpService } from '../pickup/pickup.service';

@Controller('branches')
@UseGuards(SessionGuard, PermissionGuard)
export class BranchController {
  constructor(
    private readonly branchService: BranchService,
    private readonly pickupService: PickUpService,
  ) {}

  @Post()
  @Permissions(EntityType.BRANCH, ActionType.CREATE)
  @Audit({
    entityType: EntityType.BRANCH,
    actionType: ActionType.CREATE,
    description: 'Created a new branch',
  })
  async create(@Body() dto: CreateBranchDto) {
    const branch = await this.branchService.create(dto);
    return APIResponse.success(
      { branch },
      'Branch created successfully',
      HttpStatus.CREATED,
    );
  }

  @Get()
  @Permissions(EntityType.BRANCH, ActionType.READ)
  async findAll(
    @Query() query: Record<string, any>,
  ): Promise<APIResponse<{ branches: IBranch[] } & Partial<PaginationResult>>> {
    const { items, ...pagination } = await this.branchService.findAll(query);
    return APIResponse.success(
      { branches: items, ...pagination },
      'Branches fetched successfully',
      HttpStatus.OK,
    );
  }

  @Get(':id')
  @Permissions(EntityType.BRANCH, ActionType.READ)
  async findOne(@Param('id') id: string) {
    const branch = await this.branchService.findOne(id);
    return APIResponse.success({ branch }, 'Branch retrieved successfully');
  }

  @Put(':id')
  @Permissions(EntityType.BRANCH, ActionType.UPDATE)
  @Audit({
    entityType: EntityType.BRANCH,
    actionType: ActionType.UPDATE,
    entityIdParam: 'id',
    description: 'Updated a branch',
  })
  async update(@Param('id') id: string, @Body() dto: UpdateBranchDto) {
    const branch = await this.branchService.update(id, dto);
    return APIResponse.success({ branch }, 'Branch updated successfully');
  }

  @Get(':branchId/pickups')
  async getPickupsOfCustomer(
    @Query() query: Record<string, any>,
    @Param('branchId') branchId: string,
  ): Promise<APIResponse<{ pickups: PickUp[] } & Partial<PaginationResult>>> {
    const { items, ...pagination } =
      await this.pickupService.getPickupsOfBranch(branchId, query);

    return APIResponse.success(
      { pickups: items, ...pagination },
      'Branch pickups retrieved successfully',
    );
  }

  @Delete(':id')
  @Permissions(EntityType.BRANCH, ActionType.DELETE)
  async delete(@Param('id') id: string) {
    await this.branchService.delete(id);
    return APIResponse.success(
      null,
      'Branch deleted successfully',
      HttpStatus.NO_CONTENT,
    );
  }
}
