import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';

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

export class ApiFeatures<
  TModel extends {
    findMany: (args?: any) => Promise<any>;
    count?: (args?: any) => Promise<number>;
  },
  TWhere extends Record<string, any>,
> {
  private readonly logger = new Logger(ApiFeatures.name);
  private readonly roleValues = new Set(Object.values(Role));
  private queryOptions: Prisma.SelectSubset<any, any> = { where: {} };
  private paginationResult: PaginationResult | null = null;

  constructor(
    private readonly prismaModel: TModel,
    private readonly queryString: Record<string, any> = {},
    private readonly searchableFields: (keyof TWhere & string)[] = [],
  ) {}

  filter(): this {
    const { page, sort, limit, fields, search, ...filters } = this.queryString;

    if (!filters || Object.keys(filters).length === 0) return this;

    for (const [key, rawValue] of Object.entries(filters)) {
      if (rawValue == null || rawValue === '') continue;

      const parsed = this.parseFilterValue(key, String(rawValue).trim());
      if (parsed === undefined) {
        throw new HttpException(
          `Invalid value for filter "${key}"`,
          HttpStatus.BAD_REQUEST,
        );
      }

      (this.queryOptions.where as Record<string, unknown>)[key] = parsed;
    }

    return this;
  }

  private parseFilterValue(key: string, value: string): unknown {
    // Role validation
    if (key === 'role') {
      const upper = value.toUpperCase();
      if (!this.roleValues.has(upper as Role)) {
        throw new HttpException('Invalid role value', HttpStatus.BAD_REQUEST);
      }
      return upper as Role;
    }

    // IN list filter
    if (value.includes(',')) {
      const items = value.split(',').map((v) => v.trim());
      return this.detectAndConvertArray(items);
    }

    // Comparison operators (> >= < <=)
    const match = value.match(/^([<>]=?)(.+)$/);
    if (match) {
      const [, op, raw] = match;
      const parsed = this.detectAndConvertSingle(raw.trim());
      const opMap: Record<string, string> = {
        '>': 'gt',
        '>=': 'gte',
        '<': 'lt',
        '<=': 'lte',
      };
      return { [opMap[op]]: parsed };
    }

    // Boolean
    if (value === 'true' || value === 'false') return value === 'true';

    // Numeric / Date / String
    return this.detectAndConvertSingle(value);
  }

  private detectAndConvertSingle(value: string): string | number | Date {
    if (/^\d+$/.test(value)) return Number(value);
    if (!isNaN(Date.parse(value))) return new Date(value);
    return value;
  }

  private detectAndConvertArray(values: string[]): { in: any[] } {
    const converted = values.map((v) => this.detectAndConvertSingle(v));
    return { in: converted };
  }

  search(): this {
    if (!this.queryString.search || !this.searchableFields.length) return this;

    const searchTerm = String(this.queryString.search).trim().toLowerCase();
    if (!searchTerm) return this;

    const normalizedSearch = searchTerm.replace(/\s+/g, '');
    const orConditions: TWhere[] = [];

    for (const field of this.searchableFields) {
      if (field === 'role') {
        const matches = (Object.values(Role) as string[]).filter((role) =>
          role.replace(/\s+/g, '').toLowerCase().includes(normalizedSearch),
        ) as Role[];

        if (matches.length) {
          orConditions.push({ [field]: { in: matches } } as TWhere);
        }
      } else {
        orConditions.push(
          { [field]: { contains: searchTerm, mode: 'insensitive' } } as TWhere,
          {
            [field]: { contains: normalizedSearch, mode: 'insensitive' },
          } as TWhere,
        );
      }
    }

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
    if (typeof sort === 'string' && sort.trim()) {
      this.queryOptions.orderBy = sort.split(',').map((field) => {
        const isDesc = field.startsWith('-');
        return { [field.replace(/^-/, '')]: isDesc ? 'desc' : 'asc' };
      });
    } else {
      this.queryOptions.orderBy = [{ createdAt: 'desc' }];
    }
    return this;
  }

  limitFields(): this {
    const { fields } = this.queryString;
    if (typeof fields !== 'string' || !fields.trim()) return this;

    const selectedFields = fields
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean);

    if (selectedFields.length) {
      this.queryOptions.select = selectedFields.reduce(
        (acc, f) => ({ ...acc, [f]: true }),
        {} as Record<string, boolean>,
      );
    }
    return this;
  }

  private async calculateTotal(): Promise<number> {
    try {
      return await (this.prismaModel as any).count({
        where: this.queryOptions.where,
      });
    } catch (error: any) {
      this.logger.error(
        `Error calculating total: ${error.message}`,
        error.stack,
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
      Math.max(Number(this.queryString.limit) || 50, 1),
      200,
    );
    const totalPages = Math.max(Math.ceil(totalRecords / limit), 1);
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

  include(includeObj: object): this {
    if (includeObj && typeof includeObj === 'object') {
      this.queryOptions.include = includeObj;
    }
    return this;
  }

  mergeFilter(filter: Record<string, any>): this {
    if (filter && typeof filter === 'object') {
      this.queryOptions.where = {
        ...(this.queryOptions.where || {}),
        ...filter,
      };
    }
    return this;
  }

  async query<TRecord extends { password?: string } = any>(): Promise<{
    data: TRecord[];
    pagination?: PaginationResult;
  }> {
    try {
      const data = await this.prismaModel.findMany(this.queryOptions);
      return this.paginationResult
        ? { data, pagination: this.paginationResult }
        : { data };
    } catch (error: any) {
      this.logger.error(`Error executing query: ${error.message}`, error.stack);
      throw new HttpException(
        'Failed to execute query',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
