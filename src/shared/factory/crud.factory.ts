import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ApiError } from '../../common/exceptions/api-error.exception';
import { APIResponse } from '../../common/utils/api-response.util';
import { ApiFeatures } from '../../common/utils/api-features.util';

@Injectable()
export class CrudFactoryService {
  private readonly logger = new Logger(CrudFactoryService.name);

  constructor(private readonly prisma: PrismaClient) {}

  async createOne<T>(model: any, data: any) {
    try {
      const newDoc = await model.create({ data });
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

  async updateOne<T>(model: any, id: string, data: any) {
    try {
      const updated = await model.update({
        where: { id },
        data,
      });
      return APIResponse.success(updated, 'Updated successfully');
    } catch (error) {
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

  async deleteOne<T>(model: any, id: string) {
    try {
      await model.delete({ where: { id } });
      return APIResponse.success(
        null,
        'Deleted successfully',
        HttpStatus.NO_CONTENT,
      );
    } catch (error) {
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

  async getOne<T>(model: any, id: string, include?: any) {
    const doc = await model.findUnique({
      where: { id },
      include,
    });
    if (!doc) {
      throw new ApiError(
        `No document found with id ${id}`,
        HttpStatus.NOT_FOUND,
      );
    }
    return APIResponse.success(doc, 'Retrieved successfully');
  }

  async getAll<T>(
    model: any,
    queryString: Record<string, any>,
    modelName: string,
    baseFilter: Record<string, any> = {},
  ) {
    const totalRecords = await model.count({ where: baseFilter });

    const apiFeatures = new ApiFeatures(model, queryString)
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
