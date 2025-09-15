import { Controller, Get, UseGuards } from '@nestjs/common';
import { MapService } from './map.service';
import { APIResponse } from '../../common/utils/api-response.util';
import { SessionGuard } from '../auth/guards/session.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { Permissions } from '../../common/decorators/permission.decorator';
import { EntityType, ActionType } from '@prisma/client';

@Controller('map')
@UseGuards(SessionGuard, PermissionGuard)
export class MapController {
  constructor(private readonly mapService: MapService) {}

  @Get('drivers')
  @Permissions(EntityType.DRIVER, ActionType.READ)
  async getDrivers() {
    const points = await this.mapService.getDriverLocations();
    return APIResponse.success({ points }, 'Driver locations');
  }

  @Get('branches')
  @Permissions(EntityType.BRANCH, ActionType.READ)
  async getBranches() {
    const points = await this.mapService.getBranchLocations();
    return APIResponse.success({ points }, 'Branch locations');
  }
}
