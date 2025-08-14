import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ApiError } from '../../common/exceptions/api-error.exception';
import { ApiFeatures } from '../../common/utils/api-features.util';
import {
  sanitizeUsers,
  sanitizeUser,
} from '../../common/utils/sanitize-user.util';

@Injectable()
export class BaseRepository<T extends { id: string; password?: string }> {
  protected readonly logger = new Logger(BaseRepository.name);

  constructor(
    protected readonly prisma: PrismaClient,
    protected readonly model: any,
    protected readonly searchableFields: string[] = [],
  ) {}

  async create(data: Partial<T>): Promise<T> {
    try {
      const newDoc = await this.model.create({ data });
      return sanitizeUser(newDoc) as T;
    } catch (error) {
      this.logger.error(error);
      throw new ApiError(
        'Failed to create resource',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    try {
      const updated = await this.model.update({ where: { id }, data });
      return sanitizeUser(updated) as T;
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new ApiError(
          `No document found with id ${id}`,
          HttpStatus.NOT_FOUND,
        );
      }
      this.logger.error(error);
      throw new ApiError(
        'Failed to update resource',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.model.delete({ where: { id } });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new ApiError(
          `No document found with id ${id}`,
          HttpStatus.NOT_FOUND,
        );
      }
      this.logger.error(error);
      throw new ApiError(
        'Failed to delete resource',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOne(id: string, include?: any): Promise<T> {
    const doc = await this.model.findUnique({ where: { id }, include });
    if (!doc) {
      throw new ApiError(
        `No document found with id ${id}`,
        HttpStatus.NOT_FOUND,
      );
    }
    return sanitizeUser(doc) as T;
  }

  async findAll(
    queryString: Record<string, any> = {},
    baseFilter: Record<string, any> = {},
    include?: any,
  ): Promise<{
    data: T[];
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
  }> {
    const totalRecords = await this.model.count({ where: baseFilter });

    const apiFeatures = new ApiFeatures<T>(
      this.model,
      queryString,
      this.searchableFields,
    )
      .filter()
      .search()
      .sort()
      .limitFields()
      .paginate(totalRecords)
      .include(include);

    const { data, pagination } = await apiFeatures.query();

    return {
      data: sanitizeUsers(data) as T[],
      total: pagination?.totalRecords ?? 0,
      page: pagination?.currentPage ?? 1,
      limit: pagination?.limit ?? 0,
      hasNext: pagination?.hasNext ?? false,
      hasPrev: pagination?.hasPrev ?? false,
    };
  }
}
