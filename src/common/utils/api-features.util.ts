import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export interface PaginationResult {
  totalRecords: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
  nextPage: number | null;
  prevPage: number | null;
}

type PrismaFindManyArgs = {
  where?: Record<string, any>;
  orderBy?: any;
  select?: Record<string, boolean>;
  include?: Record<string, any>;
  take?: number;
  skip?: number;
};

export class ApiFeatures<
  TModel extends {
    findMany: (args?: any) => Promise<any>;
    count?: (args?: any) => Promise<number>;
  },
  TWhere extends Record<string, any>,
> {
  private readonly logger = new Logger(ApiFeatures.name);

  private queryOptions: PrismaFindManyArgs = {};
  private paginationResult: PaginationResult | null = null;

  constructor(
    private readonly prismaModel: TModel,
    private readonly queryString: Record<string, any> = {},
    private readonly searchableFields: Extract<keyof TWhere, string>[] = [],
  ) {}

  private normalizeFilters(filters: Record<string, any>): Record<string, any> {
    return Object.fromEntries(
      Object.entries(filters)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => [k.trim(), typeof v === 'string' ? v.trim() : v]),
    );
  }

  private parseFilterValue(_: string, value: string): unknown {
    if (value.includes(',')) {
      const items = value.split(',').map((v) => v.trim());
      return { in: items.map((v) => this.detectAndConvertSingle(v)) };
    }

    const match = value.match(/^([<>]=?)(.+)$/);
    if (match) {
      const [, op, raw] = match;
      const parsed = this.detectAndConvertSingle(raw.trim());
      const opMap: Record<string, keyof Prisma.IntFilter> = {
        '>': 'gt',
        '>=': 'gte',
        '<': 'lt',
        '<=': 'lte',
      };
      return { [opMap[op]]: parsed };
    }

    if (value === 'true' || value === 'false') return value === 'true';
    return this.detectAndConvertSingle(value);
  }

  private detectAndConvertSingle(value: string): string | number | Date {
    if (/^\d+$/.test(value)) return Number(value);
    if (!isNaN(Date.parse(value))) return new Date(value);
    return value;
  }

  filter(): this {
    const { page, sort, limit, fields, search, ...rawFilters } =
      this.queryString;
    const filters = this.normalizeFilters(rawFilters);

    for (const [key, rawValue] of Object.entries(filters)) {
      const parsed = this.parseFilterValue(key, String(rawValue));
      if (parsed === undefined) {
        throw new HttpException(
          `Invalid value for filter "${key}"`,
          HttpStatus.BAD_REQUEST,
        );
      }
      this.queryOptions.where = {
        ...(this.queryOptions.where ?? {}),
        [key]: parsed,
      };
    }

    return this;
  }

  search(): this {
    if (!this.queryString.search || !this.searchableFields.length) return this;

    const searchTerm = String(this.queryString.search).trim();
    if (!searchTerm) return this;

    const normalized = searchTerm.replace(/\s+/g, '');
    const orConditions = this.searchableFields.flatMap((field) => [
      { [field]: { contains: searchTerm, mode: 'insensitive' } } as TWhere,
      { [field]: { contains: normalized, mode: 'insensitive' } } as TWhere,
    ]);

    if (orConditions.length) {
      this.queryOptions.where = {
        ...(this.queryOptions.where ?? {}),
        OR: [...(this.queryOptions.where?.OR ?? []), ...orConditions],
      };
    }

    return this;
  }

  sort(): this {
    const { sort } = this.queryString;
    this.queryOptions.orderBy =
      typeof sort === 'string' && sort.trim()
        ? sort.split(',').map((field) => {
            const isDesc = field.startsWith('-');
            return { [field.replace(/^-/, '')]: isDesc ? 'desc' : 'asc' };
          })
        : [{ createdAt: 'desc' }];

    return this;
  }

  limitFields(): this {
    const { fields } = this.queryString;
    if (!fields) return this;

    const selected = fields
      .split(',')
      .map((f: string) => f.trim())
      .filter(Boolean);
    if (selected.length) {
      this.queryOptions.select = selected.reduce(
        (acc, f) => ({ ...acc, [f]: true }),
        {},
      );
    }
    return this;
  }

  private async calculateTotal(): Promise<number> {
    if (!this.prismaModel.count) return 0;
    return await this.prismaModel.count({ where: this.queryOptions.where });
  }

  async paginate(): Promise<this> {
    const totalRecords = await this.calculateTotal();
    const page = Math.max(Number(this.queryString.page) || 1, 1);
    const limit = Math.min(
      Math.max(Number(this.queryString.limit) || 50, 1),
      200,
    );

    if (totalRecords === 0) {
      this.queryOptions.take = limit;
      this.queryOptions.skip = 0;
      this.paginationResult = {
        totalRecords: 0,
        totalPages: 0,
        currentPage: 1,
        limit,
        hasNext: false,
        hasPrev: false,
        nextPage: null,
        prevPage: null,
      };
      return this;
    }

    const totalPages = Math.ceil(totalRecords / limit);
    const safePage = Math.min(page, totalPages);

    this.queryOptions.take = limit;
    this.queryOptions.skip = (safePage - 1) * limit;
    this.paginationResult = {
      totalRecords,
      totalPages,
      currentPage: safePage,
      limit,
      hasNext: safePage < totalPages,
      hasPrev: safePage > 1,
      nextPage: safePage < totalPages ? safePage + 1 : null,
      prevPage: safePage > 1 ? safePage - 1 : null,
    };

    return this;
  }

  // include(includeObj: Record<string, any>): this {
  //   // no-op: prevent Prisma include usage
  //   // merge into select instead for consistency with BaseRepository
  //   if (includeObj && Object.keys(includeObj).length > 0) {
  //     this.queryOptions.select = {
  //       ...(this.queryOptions.select || {}),
  //       ...Object.keys(includeObj).reduce(
  //         (acc, key) => ({ ...acc, [key]: includeObj[key] ?? true }),
  //         {},
  //       ),
  //     };
  //   }
  //   return this;
  // }

  include(includeObj: Record<string, any>): this {
    this.queryOptions.include = {
      ...(this.queryOptions.include || {}),
      ...includeObj,
    };
    return this;
  }

  mergeFilter(filter: TWhere): this {
    this.queryOptions.where = { ...(this.queryOptions.where || {}), ...filter };
    return this;
  }

  getPagination(): PaginationResult | null {
    return this.paginationResult;
  }

  async query<TRecord = any>(
    withPagination = false,
  ): Promise<{ data: TRecord[]; pagination?: PaginationResult }> {
    try {
      if (withPagination && !this.paginationResult) await this.paginate();
      const data = await this.prismaModel.findMany(this.queryOptions);
      return withPagination
        ? { data, pagination: this.paginationResult! }
        : { data };
    } catch (error: any) {
      this.logger.error(`Error executing query: ${error.message}`, error.stack);
      throw new HttpException(
        `Failed to execute query: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  getQueryOptions(): PrismaFindManyArgs {
    return { ...this.queryOptions };
  }

  reset(): this {
    this.queryOptions = {};
    this.paginationResult = null;
    return this;
  }
}
