import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { ApiError } from '../../common/exceptions/api-error.exception';
import { ApiFeatures } from '../../common/utils/api-features.util';
import {
  sanitizeUsers,
  sanitizeUser,
} from '../../common/utils/sanitize-user.util';

type PrismaDelegate = {
  create: (args: any) => Promise<any>;
  update: (args: any) => Promise<any>;
  findUnique: (args: any) => Promise<any>;
  findMany: (args: any) => Promise<any[]>;
  count: (args: any) => Promise<number>;
  delete: (args: any) => Promise<any>;
};

@Injectable()
export class BaseRepository<T extends { id: string; password?: string }> {
  protected readonly logger = new Logger(BaseRepository.name);

  constructor(
    protected readonly prisma: PrismaClient,
    protected readonly model: PrismaDelegate,
    protected readonly searchableFields: string[] = [],
  ) {}

  private handleError(action: string, error: any, id?: string): never {
    if (error?.code === 'P2025' && id) {
      throw new ApiError(
        `No document found with id ${id}`,
        HttpStatus.NOT_FOUND,
      );
    }
    this.logger.error(
      `Error during ${action}: ${error?.message || error}`,
      error?.stack,
    );
    throw new ApiError(`Failed to ${action}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }

  async create(data: Partial<T>): Promise<T> {
    try {
      const newDoc = await this.model.create({ data });
      return sanitizeUser(newDoc) as T;
    } catch (error) {
      this.handleError('create resource', error);
    }
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    try {
      const updated = await this.model.update({ where: { id }, data });
      return sanitizeUser(updated) as T;
    } catch (error) {
      this.handleError('update resource', error, id);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.model.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
    } catch (error) {
      this.handleError('soft delete resource', error, id);
    }
  }

  async findOne(where: Record<string, any>, include?: any): Promise<T> {
    try {
      const doc = await this.model.findUnique({
        where,
        include,
      });

      if (!doc || doc.deletedAt) {
        throw new ApiError(
          `No document found with criteria ${JSON.stringify(where)}`,
          HttpStatus.NOT_FOUND,
        );
      }

      return sanitizeUser(doc) as T;
    } catch (error) {
      this.handleError('find resource', error);
    }
  }

  async findAll(
    queryString: Record<string, any> = {},
    baseFilter: Record<string, any> = {},
    include?: Prisma.SelectSubset<any, any>['include'],
  ) {
    try {
      const apiFeatures = new ApiFeatures<
        typeof this.model,
        Record<string, any>
      >(this.model, queryString, this.searchableFields)
        .filter()
        .search()
        .mergeFilter({ ...baseFilter, deletedAt: null })
        .sort()
        .limitFields();

      await apiFeatures.paginate();

      if (include) {
        apiFeatures.include(include);
      }

      const { data, pagination } = await apiFeatures.query();

      return {
        data: sanitizeUsers(data) as T[],
        total: pagination?.totalRecords ?? 0,
        page: pagination?.currentPage ?? 1,
        limit: pagination?.limit ?? 0,
        hasNext: pagination?.hasNext ?? false,
        hasPrev: pagination?.hasPrev ?? false,
      };
    } catch (error) {
      this.handleError('find all resources', error);
    }
  }
}
