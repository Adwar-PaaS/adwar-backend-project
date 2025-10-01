import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from 'src/db/prisma/prisma.service';
import { ApiError } from '../../common/exceptions/api-error.exception';
import {
  ApiFeatures,
  PaginationResult,
} from '../../common/utils/api-features.util';

type PayloadOptions = {
  where?: Record<string, any>;
  data?: any;
  select?: Record<string, any>;
};

interface TransactionOptions {
  timeout?: number;
  isolationLevel?: Prisma.TransactionIsolationLevel;
}

interface FindManyOptions {
  limit?: number;
  offset?: number;
}

interface GroupByAggregations {
  count?: boolean | Record<string, boolean>;
  sum?: Record<string, boolean>;
  avg?: Record<string, boolean>;
  min?: Record<string, boolean>;
  max?: Record<string, boolean>;
}

@Injectable()
export class BaseRepository<
  T extends { id: string; deletedAt?: Date | null },
  S = T,
  D extends {
    create: any;
    update: any;
    updateMany: any;
    delete: any;
    deleteMany: any;
    findUnique: any;
    findFirst: any;
    findMany: any;
    count: any;
    groupBy: any;
    upsert: any;
  } = any,
> {
  protected readonly logger: Logger;

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly delegate: D,
    protected readonly searchableFields: string[] = [],
    protected readonly defaultSelect: Record<string, any> = {},
    protected readonly useSoftDelete = true,
    private readonly sanitizeFn: (data: T) => S = (d: T) => d as unknown as S,
  ) {
    this.logger = new Logger(this.constructor.name);
  }

  private applySoftDelete(
    where: Record<string, any> = {},
  ): Record<string, any> {
    if (!this.useSoftDelete) return where;
    return { ...where, deletedAt: null };
  }

  private handleError(action: string, error: unknown, id?: string): never {
    const err = error as { code?: string; message?: string };

    if (err.code === 'P2025') {
      throw new ApiError(
        id ? `No record found with id ${id}` : 'Record not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (err.code === 'P2002') {
      throw new ApiError(
        'A record with this unique field already exists',
        HttpStatus.CONFLICT,
      );
    }

    if (err.code === 'P2003') {
      throw new ApiError(
        'Foreign key constraint failed',
        HttpStatus.BAD_REQUEST,
      );
    }

    this.logger.error(
      `[${this.delegate.constructor.name}] ${action} failed`,
      err.message || error,
      (error as Error).stack,
    );

    throw new ApiError(`Failed to ${action}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }

  private async executeWrite<R>(
    action: string,
    fn: (tx: PrismaClient) => Promise<R>,
  ): Promise<R> {
    try {
      return await this.transaction(fn);
    } catch (e) {
      this.handleError(action, e);
    }
  }

  async transaction<R>(
    cb: (tx: PrismaClient) => Promise<R>,
    options: TransactionOptions = {},
  ): Promise<R> {
    return this.prisma.$transaction(cb, {
      maxWait: options.timeout || 5000,
      timeout: options.timeout || 10000,
      isolationLevel: options.isolationLevel,
    });
  }

  private buildPrismaPayload({ where, data, select }: PayloadOptions): any {
    const payload: any = {};

    if (where !== undefined) payload.where = where;
    if (data !== undefined) payload.data = data;
    if (select && Object.keys(select).length > 0) {
      payload.select = select;
    }

    return payload;
  }

  async create(data: any, select: any = this.defaultSelect): Promise<S> {
    return this.executeWrite('create', async () => {
      const doc = await this.delegate.create(
        this.buildPrismaPayload({ data, select }),
      );
      return this.sanitizeFn(doc);
    });
  }

  async createMany(
    data: any[],
    select: any = this.defaultSelect,
  ): Promise<S[]> {
    if (data.length === 0) return [];

    return this.executeWrite('createMany', async (tx) => {
      const created = await Promise.all(
        data.map((item) =>
          (tx as any)[
            this.delegate.constructor.name.replace('Delegate', '').toLowerCase()
          ].create({
            data: item,
            select,
          }),
        ),
      );
      return created.map((d: T) => this.sanitizeFn(d));
    });
  }

  async update(
    id: string,
    data: any,
    select: any = this.defaultSelect,
  ): Promise<S> {
    return this.executeWrite('update', async () => {
      const where = this.applySoftDelete({ id });
      const doc = await this.delegate.update(
        this.buildPrismaPayload({ where, data, select }),
      );
      return this.sanitizeFn(doc);
    });
  }

  async updateMany(
    ids: string[],
    data: any,
    select: any = this.defaultSelect,
  ): Promise<S[]> {
    if (ids.length === 0) return [];

    return this.executeWrite('updateMany', async () => {
      const where = this.applySoftDelete({ id: { in: ids } });

      await this.delegate.updateMany({ where, data });

      const updated = await this.delegate.findMany(
        this.buildPrismaPayload({ where, select }),
      );

      return updated.map((d: T) => this.sanitizeFn(d));
    });
  }

  async delete(id: string): Promise<void> {
    return this.executeWrite('delete', async () => {
      const where = this.applySoftDelete({ id });

      if (this.useSoftDelete) {
        await this.delegate.update({
          where,
          data: { deletedAt: new Date() },
        });
      } else {
        await this.delegate.delete({ where });
      }
    });
  }

  async deleteMany(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;

    return this.executeWrite('deleteMany', async () => {
      const where = this.applySoftDelete({ id: { in: ids } });

      if (this.useSoftDelete) {
        const result = await this.delegate.updateMany({
          where,
          data: { deletedAt: new Date() },
        });
        return result.count || 0;
      } else {
        const result = await this.delegate.deleteMany({ where });
        return result.count || 0;
      }
    });
  }

  async findOne(
    where: Record<string, any>,
    select: any = this.defaultSelect,
  ): Promise<S | null> {
    try {
      const effectiveWhere = this.applySoftDelete(where);
      const doc = await this.delegate.findFirst(
        this.buildPrismaPayload({ where: effectiveWhere, select }),
      );

      return doc ? this.sanitizeFn(doc) : null;
    } catch (err) {
      this.handleError('findOne', err);
    }
  }

  async findById(
    id: string,
    select: any = this.defaultSelect,
  ): Promise<S | null> {
    return this.findOne({ id }, select);
  }

  async findOneOrFail(
    where: Record<string, any>,
    select: any = this.defaultSelect,
  ): Promise<S> {
    const doc = await this.findOne(where, select);

    if (!doc) {
      throw new ApiError('Record not found', HttpStatus.NOT_FOUND);
    }

    return doc;
  }

  async findMany(
    where: Record<string, any> = {},
    select: any = this.defaultSelect,
    options: FindManyOptions = {},
  ): Promise<S[]> {
    try {
      const payload = this.buildPrismaPayload({
        where: this.applySoftDelete(where),
        select,
      });

      if (options.limit !== undefined) {
        payload.take = Math.max(0, options.limit);
      }

      if (options.offset !== undefined) {
        payload.skip = Math.max(0, options.offset);
      }

      const docs = await this.delegate.findMany(payload);
      return docs.map((d: T) => this.sanitizeFn(d));
    } catch (err) {
      this.handleError('findMany', err);
    }
  }

  async findAll(
    queryString: Record<string, any> = {},
    where: Record<string, any> = {},
    select: Record<string, any> = this.defaultSelect,
  ): Promise<{ items: S[] } & Partial<PaginationResult>> {
    try {
      const apiFeatures = new ApiFeatures(
        this.delegate,
        queryString,
        this.searchableFields,
      )
        .filter()
        .search()
        .mergeFilter(this.applySoftDelete(where))
        .sort()
        .limitFields()
        .mergeSelect(select);

      const { data, pagination } = await apiFeatures.query(true);

      return {
        items: data.map((d: T) => this.sanitizeFn(d)),
        ...(pagination ?? {}),
      };
    } catch (err) {
      this.handleError('findAll', err);
    }
  }

  async count(where: Record<string, any> = {}): Promise<number> {
    try {
      return await this.delegate.count({
        where: this.applySoftDelete(where),
      });
    } catch (err) {
      this.handleError('count', err);
    }
  }

  // async exists(where: Record<string, any>): Promise<boolean> {
  //   try {
  //     return !!(await this.delegate.findFirst({
  //       where: this.applySoftDelete(where),
  //       select: { id: true },
  //     }));
  //   } catch (err) {
  //     this.handleError('exists', err);
  //   }
  // }

  async exists(where: Record<string, any>): Promise<boolean> {
    try {
      const count = await this.delegate.count({
        where: this.applySoftDelete(where),
        take: 1,
      });
      return count > 0;
    } catch (err) {
      this.handleError('exists', err);
    }
  }

  async queryRaw<R = any>(
    query: TemplateStringsArray | Prisma.Sql,
    ...values: any[]
  ): Promise<R[]> {
    try {
      return await this.prisma.$queryRaw<R[]>(query as any, ...values);
    } catch (err) {
      this.handleError('queryRaw', err);
    }
  }

  async executeRaw(
    query: TemplateStringsArray | Prisma.Sql,
    ...values: any[]
  ): Promise<number> {
    try {
      return await this.prisma.$executeRaw(query as any, ...values);
    } catch (err) {
      this.handleError('executeRaw', err);
    }
  }

  async groupBy(
    by: (keyof T)[],
    where: Record<string, any> = {},
    aggregations: GroupByAggregations = { count: true },
  ): Promise<any[]> {
    try {
      return await this.delegate.groupBy({
        by: by as string[],
        where: this.applySoftDelete(where),
        _count:
          aggregations.count === true ? { _all: true } : aggregations.count,
        _sum: aggregations.sum,
        _avg: aggregations.avg,
        _min: aggregations.min,
        _max: aggregations.max,
      });
    } catch (err) {
      this.handleError('groupBy', err);
    }
  }

  async restore(id: string, select: any = this.defaultSelect): Promise<S> {
    if (!this.useSoftDelete) {
      throw new ApiError(
        'Restore operation not supported for hard delete',
        HttpStatus.BAD_REQUEST,
      );
    }

    return this.executeWrite('restore', async () => {
      const doc = await this.delegate.update({
        where: { id, deletedAt: { not: null } },
        data: { deletedAt: null },
        select: this.buildPrismaPayload({ select }).select,
      });
      return this.sanitizeFn(doc);
    });
  }

  async upsert(
    where: Record<string, any>,
    create: any,
    update: any,
    select: any = this.defaultSelect,
  ): Promise<S> {
    return this.executeWrite('upsert', async () => {
      const doc = await this.delegate.upsert({
        where,
        create,
        update,
        select: this.buildPrismaPayload({ select }).select,
      });
      return this.sanitizeFn(doc);
    });
  }
}
