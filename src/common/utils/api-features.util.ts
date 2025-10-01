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

export type PrismaFindManyArgs = {
  where?: Record<string, any>;
  orderBy?: Record<string, 'asc' | 'desc'>[];
  select?: Record<string, boolean>;
  take?: number;
  skip?: number;
};

type FilterOperator = 'in' | 'not' | 'contains' | 'gt' | 'gte' | 'lt' | 'lte';

export class ApiFeatures<
  TModel extends {
    findMany: (args?: PrismaFindManyArgs) => Promise<any[]>;
    count: (args?: { where?: Record<string, any> }) => Promise<number>;
  },
> {
  private readonly logger = new Logger(ApiFeatures.name);
  private readonly MAX_LIMIT = 200;
  private readonly DEFAULT_LIMIT = 50;
  private readonly MIN_LIMIT = 1;

  private queryOptions: PrismaFindManyArgs = {};
  private paginationResult: PaginationResult | null = null;
  private totalRecordsCache: number | null = null;

  constructor(
    private readonly prismaModel: TModel,
    private readonly queryString: Record<string, string | undefined> = {},
    private readonly searchableFields: string[] = [],
  ) {}

  private normalizeFilters(filters: Record<string, any>): Record<string, any> {
    return Object.fromEntries(
      Object.entries(filters).filter(
        ([, v]) => v !== undefined && v !== null && v !== '',
      ),
    );
  }

  private detectAndConvertSingle(value: string): string | number | Date {
    const trimmed = value.trim();

    const numRegex = /^-?\d*\.?\d+$/;
    if (numRegex.test(trimmed)) {
      return Number(trimmed);
    }

    const isoDateRegex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
    if (isoDateRegex.test(trimmed)) {
      const date = new Date(trimmed);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }

    return trimmed;
  }

  private parseFilterValue(key: string, raw: string): unknown {
    const value = raw.trim();

    if (value.includes(',')) {
      const values = value
        .split(',')
        .map((v) => this.detectAndConvertSingle(v.trim()))
        .filter((v) => v !== '');

      return values.length > 0 ? { in: values } : undefined;
    }

    if (value.startsWith('!=')) {
      const parsed = this.detectAndConvertSingle(value.slice(2).trim());
      return { not: parsed };
    }

    if (value.startsWith('~')) {
      return {
        contains: value.slice(1).trim(),
        mode: 'insensitive' as const,
      };
    }

    if (value.startsWith('^')) {
      return {
        startsWith: value.slice(1).trim(),
        mode: 'insensitive' as const,
      };
    }

    if (value.startsWith('$')) {
      return {
        endsWith: value.slice(1).trim(),
        mode: 'insensitive' as const,
      };
    }

    if (value.startsWith('=')) {
      return this.detectAndConvertSingle(value.slice(1).trim());
    }

    const comparisonMatch = value.match(/^([<>]=?)(.+)$/);
    if (comparisonMatch) {
      const [, op, rawValue] = comparisonMatch;
      const parsed = this.detectAndConvertSingle(rawValue.trim());

      if (typeof parsed === 'string') {
        throw new HttpException(
          `Invalid value for operator ${op} in filter "${key}". Must be number or date.`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const opMap: Record<string, FilterOperator> = {
        '>': 'gt',
        '>=': 'gte',
        '<': 'lt',
        '<=': 'lte',
      };

      return { [opMap[op]]: parsed };
    }

    const lowerValue = value.toLowerCase();
    if (['true', 'false'].includes(lowerValue)) {
      return lowerValue === 'true';
    }

    return this.detectAndConvertSingle(value);
  }

  filter(): this {
    const { page, sort, limit, fields, search, ...rawFilters } =
      this.queryString;

    const filters = this.normalizeFilters(rawFilters);

    for (const [key, rawValue] of Object.entries(filters)) {
      if (typeof rawValue !== 'string') continue;

      try {
        const parsedValue = this.parseFilterValue(key, rawValue);

        if (parsedValue !== undefined) {
          this.queryOptions.where = {
            ...(this.queryOptions.where ?? {}),
            [key]: parsedValue,
          };
        }
      } catch (error) {
        this.logger.warn(
          `Failed to parse filter for key "${key}": ${(error as Error).message}`,
        );
        throw error;
      }
    }

    return this;
  }

  search(): this {
    const searchTerm = this.queryString.search?.trim();
    if (!searchTerm || !this.searchableFields.length) return this;

    const words = searchTerm.split(/\s+/).filter(Boolean);
    if (!words.length) return this;

    const orConditions = this.searchableFields.flatMap((field) => {
      const fieldPath = field.split('.');
      return words.map((word) => {
        const condition = { contains: word, mode: 'insensitive' as const };

        if (fieldPath.length === 1) {
          return { [fieldPath[0]]: condition };
        }

        return fieldPath
          .reverse()
          .reduce<
            Record<string, any>
          >((acc, part) => ({ [part]: acc }), condition);
      });
    });

    this.queryOptions.where = {
      ...(this.queryOptions.where ?? {}),
      OR: [...(this.queryOptions.where?.OR ?? []), ...orConditions],
    };

    return this;
  }

  sort(): this {
    const sortStr = this.queryString.sort?.trim();

    if (!sortStr) {
      this.queryOptions.orderBy = [{ createdAt: 'desc' }];
      return this;
    }

    try {
      this.queryOptions.orderBy = sortStr.split(',').map((field) => {
        const trimmedField = field.trim();
        const isDesc = trimmedField.startsWith('-');
        const fieldName = trimmedField.replace(/^-/, '');

        return {
          [fieldName]: isDesc ? ('desc' as const) : ('asc' as const),
        };
      });
    } catch (error) {
      this.logger.warn(`Failed to parse sort: ${(error as Error).message}`);
      this.queryOptions.orderBy = [{ createdAt: 'desc' }];
    }

    return this;
  }

  limitFields(): this {
    const fieldsStr = this.queryString.fields?.trim();

    if (!fieldsStr) return this;

    const selected = fieldsStr
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean);

    if (selected.length > 0) {
      this.queryOptions.select = selected.reduce<Record<string, true>>(
        (acc, f) => ({ ...acc, [f]: true }),
        {},
      );

      if (!this.queryOptions.select.id) {
        this.queryOptions.select.id = true;
      }
    }

    return this;
  }

  private async calculateTotal(): Promise<number> {
    if (this.totalRecordsCache !== null) {
      return this.totalRecordsCache;
    }

    try {
      this.totalRecordsCache = await this.prismaModel.count({
        where: this.queryOptions.where,
      });
      return this.totalRecordsCache;
    } catch (error) {
      this.logger.error(
        `Failed to calculate total: ${(error as Error).message}`,
      );
      throw new HttpException(
        'Failed to calculate total records',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async paginate(): Promise<this> {
    const totalRecords = await this.calculateTotal();

    const page = Math.max(Number(this.queryString.page) || 1, 1);

    const limit = Math.min(
      Math.max(
        Number(this.queryString.limit) || this.DEFAULT_LIMIT,
        this.MIN_LIMIT,
      ),
      this.MAX_LIMIT,
    );

    const totalPages = totalRecords > 0 ? Math.ceil(totalRecords / limit) : 0;

    const safePage = totalPages > 0 ? Math.min(page, totalPages) : 1;

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

  mergeFilter(extraWhere: Record<string, any>): this {
    if (!extraWhere || Object.keys(extraWhere).length === 0) {
      return this;
    }

    this.queryOptions.where = {
      ...(this.queryOptions.where || {}),
      ...extraWhere,
    };

    return this;
  }

  mergeSelect(extraSelect: Record<string, any>): this {
    if (!extraSelect || Object.keys(extraSelect).length === 0) {
      return this;
    }

    this.queryOptions.select = {
      ...(this.queryOptions.select || {}),
      ...extraSelect,
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
      if (withPagination && !this.paginationResult) {
        await this.paginate();
      }

      const data = await this.prismaModel.findMany(this.queryOptions);

      return withPagination
        ? { data, pagination: this.paginationResult ?? undefined }
        : { data };
    } catch (error: unknown) {
      const message = (error as Error).message || 'Unknown error';
      this.logger.error(
        `Error executing query: ${message}`,
        (error as Error).stack,
      );
      throw new HttpException(
        `Failed to execute query: ${message}`,
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
    this.totalRecordsCache = null;
    return this;
  }

  clone(): ApiFeatures<TModel> {
    const cloned = new ApiFeatures(this.prismaModel, { ...this.queryString }, [
      ...this.searchableFields,
    ]);
    cloned.queryOptions = { ...this.queryOptions };
    return cloned;
  }
}
