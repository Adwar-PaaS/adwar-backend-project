import {
  Controller,
  Post,
  Body,
  UploadedFile,
  UseInterceptors,
  Patch,
  Param,
  Delete,
  UseGuards,
  Get,
  Query,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { TenantService } from './tenant.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { UpdateTenantStatusDto } from './dto/update-tenant-status.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { PaginationOptions } from '../../common/interfaces/pagination-options.interface';

@Controller('tenants')
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('logo'))
  async create(
    @Body() dto: CreateTenantDto,
    @UploadedFile() logo: Express.Multer.File,
    @CurrentUser() user: JwtPayload,
    @Res() res: Response,
  ) {
    const result = await this.tenantService.create(dto, user.id, logo);
    return res.status(result.statusCode).json(result);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Query() query: PaginationOptions, @Res() res: Response) {
    const result = await this.tenantService.list(query);
    return res.status(result.statusCode).json(result);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id') id: string, @Res() res: Response) {
    const result = await this.tenantService.findOne(id);
    return res.status(result.statusCode).json(result);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('logo'))
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateTenantDto,
    @UploadedFile() logo: Express.Multer.File,
    @Res() res: Response,
  ) {
    const result = await this.tenantService.update(id, dto, logo);
    return res.status(result.statusCode).json(result);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTenantStatusDto,
    @Res() res: Response,
  ) {
    const result = await this.tenantService.updateStatus(id, dto.status);
    return res.status(result.statusCode).json(result);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string, @Res() res: Response) {
    const result = await this.tenantService.remove(id);
    return res.status(result.statusCode).json(result);
  }
}
