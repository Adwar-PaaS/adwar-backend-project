import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ApiError } from '../../common/exceptions/api-error.exception';
import { APIResponse } from '../../common/utils/api-response.util';
import { ApiFeatures } from '../../common/utils/api-features.util';

@Injectable()
export class BaseRepository<T extends { id: string }> {
  protected readonly logger = new Logger(BaseRepository.name);

  constructor(
    protected readonly prisma: PrismaClient,
    protected readonly model: any,
  ) {}

  async create(data: Partial<T>) {
    try {
      const newDoc = await this.model.create({ data });
      return APIResponse.success(
        newDoc,
        'Created successfully',
        HttpStatus.CREATED,
      );
    } catch (error) {
      this.logger.error(error);
      throw new ApiError(
        'Failed to create resource',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async update(id: string, data: Partial<T>) {
    try {
      const updated = await this.model.update({ where: { id }, data });
      return APIResponse.success(updated, 'Updated successfully');
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

  async delete(id: string) {
    try {
      await this.model.delete({ where: { id } });
      return APIResponse.success(
        null,
        'Deleted successfully',
        HttpStatus.NO_CONTENT,
      );
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

  async findOne(id: string, include?: any) {
    const doc = await this.model.findUnique({ where: { id }, include });
    if (!doc) {
      throw new ApiError(
        `No document found with id ${id}`,
        HttpStatus.NOT_FOUND,
      );
    }
    return APIResponse.success(doc, 'Retrieved successfully');
  }

  async findAll(
    queryString: Record<string, any>,
    baseFilter: Record<string, any> = {},
  ) {
    const totalRecords = await this.model.count({ where: baseFilter });

    const apiFeatures = new ApiFeatures(this.model, queryString)
      .filter()
      .search()
      .sort()
      .limitFields()
      .paginate(totalRecords);

    const { data, pagination } = await apiFeatures.query();

    return APIResponse.paginated(data, {
      total: pagination?.totalRecords ?? 0,
      page: pagination?.currentPage ?? 1,
      limit: pagination?.limit ?? 0,
      hasNext: pagination?.hasNext ?? false,
      hasPrev: pagination?.hasPrev ?? false,
    });
  }
}
