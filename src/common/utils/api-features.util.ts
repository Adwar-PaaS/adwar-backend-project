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

export class ApiFeatures<T> {
  private readonly logger = new Logger(ApiFeatures.name);
  private readonly roleValues = new Set(Object.values(Role));
  private queryOptions: Prisma.SelectSubset<any, any> = { where: {} };
  private paginationResult: PaginationResult | null = null;

  constructor(
    private readonly prismaModel: { findMany: Function },
    private readonly queryString: Record<string, any> = {},
    private readonly searchableFields: string[] = [],
  ) {}

  filter(): this {
    const { page, sort, limit, fields, search, ...filters } = this.queryString;

    for (const [key, value] of Object.entries(filters)) {
      if (value == null || value === '') continue;
      const parsed = this.parseFilterValue(key, String(value).trim());
      if (parsed !== undefined) {
        this.queryOptions.where![key] = parsed;
      }
    }
    return this;
  }

  private parseFilterValue(key: string, value: string): unknown {
    if (key === 'role') {
      const upper = value.toUpperCase();
      return this.roleValues.has(upper as Role) ? (upper as Role) : undefined;
    }

    if (value.includes(',')) {
      return { in: value.split(',').map((v) => v.trim()) };
    }

    const match = value.match(/^([<>]=?)(.+)$/);
    if (match) {
      const [, op, num] = match;
      const n = Number(num);
      if (!isNaN(n)) {
        const opMap: Record<string, keyof Prisma.IntFilter> = {
          '>': 'gt',
          '>=': 'gte',
          '<': 'lt',
          '<=': 'lte',
        };
        return { [opMap[op]]: n };
      }
    }

    if (value === 'true' || value === 'false') {
      return value === 'true';
    }

    if (!isNaN(Number(value))) {
      return Number(value);
    }

    return value;
  }

  search(): this {
    if (!this.queryString.search || !this.searchableFields.length) return this;

    const searchTerm = String(this.queryString.search).trim().toLowerCase();
    const normalizedSearch = searchTerm.replace(/\s+/g, '');

    const existingOR = Array.isArray(this.queryOptions.where?.OR)
      ? this.queryOptions.where!.OR
      : [];

    const orConditions = this.searchableFields.flatMap(
      (field: string): Record<string, unknown>[] => {
        if (field === 'role') {
          const matches = (Object.values(Role) as string[]).filter((role) =>
            role.replace(/\s+/g, '').toLowerCase().includes(normalizedSearch),
          ) as Role[];
          return matches.length ? [{ [field]: { in: matches } }] : [];
        }

        return [
          {
            [field]: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
          {
            [field]: {
              contains: normalizedSearch,
              mode: 'insensitive',
            },
          },
        ];
      },
    );

    this.queryOptions.where!.OR = [...existingOR, ...orConditions];
    return this;
  }

  sort(): this {
    if (
      typeof this.queryString.sort === 'string' &&
      this.queryString.sort.trim()
    ) {
      this.queryOptions.orderBy = this.queryString.sort.split(',').map((f) => {
        const isDesc = f.startsWith('-');
        return { [f.replace(/^-/, '')]: isDesc ? 'desc' : 'asc' };
      });
    } else {
      this.queryOptions.orderBy = [{ createdAt: 'desc' }];
    }
    return this;
  }

  limitFields(): this {
    if (typeof this.queryString.fields !== 'string') return this;

    const fields = this.queryString.fields
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean);

    if (fields.length) {
      this.queryOptions.select = fields.reduce(
        (acc, f) => {
          acc[f] = true;
          return acc;
        },
        {} as Record<string, boolean>,
      );
    }
    return this;
  }

  paginate(totalRecords: number): this {
    const page = Math.max(Number(this.queryString.page) || 1, 1);
    const limit = Math.max(Number(this.queryString.limit) || 50, 1);
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
    this.queryOptions.include = includeObj;
    return this;
  }

  async query(): Promise<{ data: T[]; pagination?: PaginationResult }> {
    try {
      const data = await this.prismaModel.findMany(this.queryOptions);
      return this.paginationResult
        ? { data, pagination: this.paginationResult }
        : { data };
    } catch (error: any) {
      this.logger.error(`Error executing query: ${error.message}`, error.stack);

      if (error.message?.includes('not found in enum')) {
        const enumName =
          error.message.match(/enum '(\w+)'/)?.[1] ?? 'unknown enum';
        throw new HttpException(
          `Invalid value for ${enumName}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      throw new HttpException(
        'Failed to execute query',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
