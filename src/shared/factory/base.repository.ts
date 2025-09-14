import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ApiError } from '../../common/exceptions/api-error.exception';
import {
  ApiFeatures,
  PaginationResult,
} from '../../common/utils/api-features.util';
import {
  sanitizeUsers,
  sanitizeUser,
} from '../../common/utils/sanitize-user.util';
import { PrismaService } from 'src/db/prisma/prisma.service';

type PrismaDelegate = {
  create: (args: any) => Promise<any>;
  update: (args: any) => Promise<any>;
  findUnique?: (args: any) => Promise<any>;
  findFirst?: (args: any) => Promise<any>;
  findMany: (args: any) => Promise<any[]>;
  count: (args: any) => Promise<number>;
  delete?: (args: any) => Promise<any>;
};

@Injectable()
export class BaseRepository<
  T extends { id: string; password?: string; deletedAt?: Date | null },
> {
  protected readonly logger = new Logger(BaseRepository.name);

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly model: PrismaDelegate,
    protected readonly searchableFields: string[] = [],
    protected readonly defaultInclude: Record<string, any> = {},
    protected readonly useSoftDelete = true,
  ) {}

  private handleError(action: string, error: any, id?: string): never {
    if (error?.code === 'P2025') {
      throw new ApiError(
        id ? `No record found with id ${id}` : 'Record not found',
        HttpStatus.NOT_FOUND,
      );
    }

    this.logger.error(
      `Error during ${action}: ${error?.message || error}`,
      error?.stack,
    );

    throw new ApiError(`Failed to ${action}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }

  async create(data: any, include: any = this.defaultInclude): Promise<T> {
    try {
      const newDoc = await this.model.create({ data, include });
      return sanitizeUser(newDoc) as T;
    } catch (error) {
      this.handleError('create', error);
    }
  }

  async update(
    id: string,
    data: any,
    include: any = this.defaultInclude,
  ): Promise<T> {
    try {
      const updated = await this.model.update({ where: { id }, data, include });
      return sanitizeUser(updated) as T;
    } catch (error) {
      this.handleError('update', error, id);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      if (this.useSoftDelete) {
        await this.model.update({
          where: { id },
          data: { deletedAt: new Date() },
        });
      } else if (this.model.delete) {
        await this.model.delete({ where: { id } });
      }
    } catch (error) {
      this.handleError('delete', error, id);
    }
  }

  async findOne(
    where: Record<string, any>,
    include: any = this.defaultInclude,
  ): Promise<T> {
    try {
      const finder = this.model.findUnique ?? this.model.findFirst;
      const doc = await finder?.({ where, include });

      if (!doc || (this.useSoftDelete && doc.deletedAt)) {
        throw new ApiError(
          `No record found with criteria ${JSON.stringify(where)}`,
          HttpStatus.NOT_FOUND,
        );
      }

      return sanitizeUser(doc) as T;
    } catch (error) {
      this.handleError('find one', error);
    }
  }

  async findAll(
    queryString: Record<string, any> = {},
    where: Record<string, any> = {},
    include: Record<string, any> = this.defaultInclude,
  ): Promise<{ items: T[] } & Partial<PaginationResult>> {
    try {
      const apiFeatures = new ApiFeatures(
        this.model,
        queryString,
        this.searchableFields,
      )
        .filter()
        .search()
        .mergeFilter({
          ...where,
          ...(this.useSoftDelete ? { deletedAt: null } : {}),
        })
        .sort()
        .limitFields();

      await apiFeatures.paginate();
      apiFeatures.include(include);

      const { data, pagination } = await apiFeatures.query();

      return {
        items: sanitizeUsers(data) as T[],
        ...(pagination ?? {}),
      };
    } catch (error) {
      this.handleError('find all', error);
    }
  }
}
