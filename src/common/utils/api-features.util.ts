import { HttpException, HttpStatus, Logger } from '@nestjs/common';

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

  private parseFilterValue(key: string, value: string): unknown {
    value = value.trim();

    if (value.includes(',')) {
      const items = value.split(',').map((v) => v.trim());
      return { in: items.map((v) => this.detectAndConvertSingle(v)) };
    }

    if (value.startsWith('!=')) {
      const raw = value.slice(2).trim();
      const parsed = this.detectAndConvertSingle(raw);
      return { not: parsed };
    }

    if (value.startsWith('~')) {
      const raw = value.slice(1).trim();
      return { contains: raw, mode: 'insensitive' };
    }

    if (value.startsWith('=')) {
      const raw = value.slice(1).trim();
      return this.detectAndConvertSingle(raw);
    }

    const match = value.match(/^([<>]=?)(.+)$/);
    if (match) {
      const [, op, raw] = match;
      const parsed = this.detectAndConvertSingle(raw.trim());
      if (typeof parsed === 'string') {
        throw new HttpException(
          `Invalid value for operator ${op} in filter "${key}", must be number or date`,
          HttpStatus.BAD_REQUEST,
        );
      }
      const opMap: Record<string, string> = {
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
    const numRegex = /^-?\d*\.?\d+$/;
    if (numRegex.test(value)) return Number(value);
    if (!isNaN(Date.parse(value))) return new Date(value);
    return value;
  }

  filter(): this {
    const { page, sort, limit, fields, search, ...rawFilters } =
      this.queryString;
    const filters = this.normalizeFilters(rawFilters);

    for (const [key, rawValue] of Object.entries(filters)) {
      const parsed = this.parseFilterValue(key, String(rawValue));
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
    if (typeof sort !== 'string' || !sort.trim()) {
      this.queryOptions.orderBy = [{ createdAt: 'desc' }];
      return this;
    }

    this.queryOptions.orderBy = sort.split(',').map((field) => {
      const isDesc = field.startsWith('-');
      return { [field.replace(/^-/, '')]: isDesc ? 'desc' : 'asc' };
    });

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
    return this.prismaModel.count({
      where: this.queryOptions.where,
    });
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

  mergeFilter(filter: TWhere): this {
    this.queryOptions.where = { ...(this.queryOptions.where || {}), ...filter };
    return this;
  }

  mergeSelect(mergedSelect: Record<string, boolean>): this {
    this.queryOptions.select = {
      ...(this.queryOptions.select || {}),
      ...mergedSelect,
    };
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
