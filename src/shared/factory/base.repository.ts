import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from 'src/db/prisma/prisma.service';
import { RedisService } from 'src/db/redis/redis.service';
import { ApiError } from '../../common/exceptions/api-error.exception';
import {
  ApiFeatures,
  PaginationResult,
} from '../../common/utils/api-features.util';
import * as crypto from 'crypto';

@Injectable()
export class BaseRepository<
  T extends { id: string; deletedAt?: Date | null },
  S = T,
  K extends keyof PrismaClient = keyof PrismaClient,
> {
  protected readonly logger = new Logger(BaseRepository.name);

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly redis: RedisService,
    private readonly modelKey: K,
    protected readonly searchableFields: string[] = [],
    protected readonly defaultSelect: Record<string, any> = {},
    protected readonly useSoftDelete = true,
    private readonly sanitizeFn: (data: T) => S = (d: T) => d as unknown as S,
    private readonly cacheTTL = process.env.NODE_ENV === 'production'
      ? 3600
      : 30,
  ) {}

  private get delegate(): any {
    return this.prisma[this.modelKey];
  }

  private applySoftDelete(
    where: Record<string, any> = {},
  ): Record<string, any> {
    return this.useSoftDelete ? { ...where, deletedAt: null } : where;
  }

  private async withCache<R>(
    key: string,
    fetchFn: () => Promise<R>,
    useCache = true,
  ): Promise<R> {
    if (!useCache) return fetchFn();
    const cached = await this.cacheGet<R>(key);
    if (cached) return cached;
    const result = await fetchFn();
    await this.cacheSet(key, result);
    return result;
  }

  private buildCacheKey(action: string, extra: any = {}): string {
    const entries = Object.entries(extra).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    const normalized = JSON.stringify(Object.fromEntries(entries));
    const hash = crypto.createHash('md5').update(normalized).digest('hex');
    return `${String(this.modelKey)}:${action}:${hash}`;
  }

  private async cacheGet<T = any>(key: string): Promise<T | null> {
    try {
      return await this.redis.get<T>(key);
    } catch {
      return null;
    }
  }

  private async cacheSet(key: string, value: any, ttl = this.cacheTTL) {
    try {
      await this.redis.set(key, value, ttl);
    } catch {}
  }

  private async invalidateRelatedCache(ids?: string | string[]) {
    const idArray = Array.isArray(ids) ? ids : ids ? [ids] : [];
    const patterns = [
      `${String(this.modelKey)}:findAll:*`,
      `${String(this.modelKey)}:findMany:*`,
    ];
    idArray.forEach((id) =>
      patterns.push(`${String(this.modelKey)}:findOne:*${id}*`),
    );
    await Promise.all(patterns.map((p) => this.redis.delByPattern(p)));
  }

  private handleError(action: string, error: any, id?: string): never {
    if (error?.code === 'P2025') {
      throw new ApiError(
        id ? `No record found with id ${id}` : 'Record not found',
        HttpStatus.NOT_FOUND,
      );
    }
    this.logger.error(
      `[${String(this.modelKey)}] ${action} failed: ${error?.message || error}`,
    );
    throw new ApiError(`Failed to ${action}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }

  private async executeWrite<R>(
    action: string,
    fn: (tx: PrismaClient) => Promise<R>,
    ids?: string | string[],
  ): Promise<R> {
    return this.transaction(fn)
      .then(async (res) => {
        await this.invalidateRelatedCache(ids);
        return res;
      })
      .catch((e) =>
        this.handleError(action, e, Array.isArray(ids) ? ids[0] : ids),
      );
  }

  async transaction<R>(
    cb: (tx: Omit<PrismaClient, '$connect' | '$disconnect'>) => Promise<R>,
    options: {
      timeout?: number;
      isolationLevel?: Prisma.TransactionIsolationLevel;
    } = {},
  ): Promise<R> {
    return this.prisma.$transaction(cb, {
      timeout: options.timeout || 10000,
      isolationLevel: options.isolationLevel,
    });
  }

  async create(data: any, select: any = this.defaultSelect): Promise<S> {
    return this.executeWrite('create', async (tx) => {
      const doc = await (tx[this.modelKey] as any).create({ data, select });
      return this.sanitizeFn(doc);
    });
  }

  async update(
    id: string,
    data: any,
    select: any = this.defaultSelect,
  ): Promise<S> {
    return this.executeWrite(
      'update',
      async (tx) => {
        const doc = await (tx[this.modelKey] as any).update({
          where: { id },
          data,
          select,
        });
        return this.sanitizeFn(doc);
      },
      id,
    );
  }

  async updateMany(
    ids: string[],
    data: any,
    select: any = this.defaultSelect,
  ): Promise<T[]> {
    return this.executeWrite(
      'updateMany',
      async (tx) => {
        await (tx[this.modelKey] as any).updateMany({
          where: { id: { in: ids } },
          data,
        });
        const updated = await (tx[this.modelKey] as any).findMany({
          where: this.applySoftDelete({ id: { in: ids } }),
          select,
        });
        return updated.map((d: any) => this.sanitizeFn(d));
      },
      ids,
    );
  }

  async delete(id: string): Promise<void> {
    return this.executeWrite(
      'delete',
      async (tx) => {
        if (this.useSoftDelete) {
          await (tx[this.modelKey] as any).update({
            where: { id },
            data: { deletedAt: new Date() },
          });
        } else {
          await (tx[this.modelKey] as any).delete({ where: { id } });
        }
      },
      id,
    );
  }

  async deleteMany(ids: string[]): Promise<void> {
    return this.executeWrite(
      'deleteMany',
      async (tx) => {
        if (this.useSoftDelete) {
          await (tx[this.modelKey] as any).updateMany({
            where: { id: { in: ids } },
            data: { deletedAt: new Date() },
          });
        } else {
          await (tx[this.modelKey] as any).deleteMany({
            where: { id: { in: ids } },
          });
        }
      },
      ids,
    );
  }

  async findOne(
    where: Record<string, any>,
    select: any = this.defaultSelect,
    useCache = true,
  ): Promise<S> {
    const cacheKey = this.buildCacheKey('findOne', { where, select });
    return this.withCache(
      cacheKey,
      async () => {
        const doc = await this.delegate.findUnique({
          where: this.applySoftDelete(where),
          select,
        });
        if (!doc) throw new ApiError(`Not found`, HttpStatus.NOT_FOUND);
        return this.sanitizeFn(doc);
      },
      useCache,
    );
  }

  async findMany(
    where: Record<string, any> = {},
    select: any = this.defaultSelect,
    options: { limit?: number; useCache?: boolean } = {},
  ): Promise<T[]> {
    const { limit, useCache = true } = options;
    const cacheKey = this.buildCacheKey('findMany', { where, select, limit });
    return this.withCache(
      cacheKey,
      async () => {
        const docs = await this.delegate.findMany({
          where: this.applySoftDelete(where),
          select,
          ...(limit ? { take: limit } : {}),
        });
        return docs.map((d: any) => this.sanitizeFn(d));
      },
      useCache,
    );
  }

  async findAll(
    queryString: Record<string, any> = {},
    where: Record<string, any> = {},
    select: Record<string, any> = this.defaultSelect,
    useCache = true,
  ): Promise<{ items: S[] } & Partial<PaginationResult>> {
    const cacheKey = this.buildCacheKey('findAll', {
      queryString,
      where,
      select,
    });
    return this.withCache(
      cacheKey,
      async () => {
        const apiFeatures = new ApiFeatures(
          this.delegate,
          queryString,
          this.searchableFields,
        )
          .filter()
          .search()
          .mergeFilter(this.applySoftDelete(where))
          .sort()
          .limitFields();
        await apiFeatures.paginate();
        const opts = apiFeatures.getQueryOptions();
        opts.select = { ...(opts.select || {}), ...select };
        const { data, pagination } = await apiFeatures.query(true);
        const items = data.map((d: any) => this.sanitizeFn(d));
        return { items, ...(pagination ?? {}) };
      },
      useCache,
    );
  }

  async count(where: Record<string, any> = {}): Promise<number> {
    const cacheKey = this.buildCacheKey('count', where);
    return this.withCache(cacheKey, async () => {
      return this.delegate.count({ where: this.applySoftDelete(where) });
    });
  }

  async exists(where: Record<string, any>): Promise<boolean> {
    const count = await this.delegate.count({
      where: this.applySoftDelete(where),
      take: 1,
    });
    return count > 0;
  }
}
