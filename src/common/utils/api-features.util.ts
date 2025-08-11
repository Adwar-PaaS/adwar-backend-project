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
  private queryOptions: Prisma.SelectSubset<any, any> = { where: {} };
  private paginationResult: PaginationResult | null = null;

  constructor(
    private readonly prismaModel: any,
    private readonly queryString: Partial<Record<string, any>>,
    private readonly searchableFields: string[] = [],
  ) {}

  filter(): this {
    const queryObj = { ...this.queryString };
    const excludeFields = ['page', 'sort', 'limit', 'fields', 'search'];
    excludeFields.forEach((field) => delete queryObj[field]);

    if (!this.queryOptions.where) this.queryOptions.where = {};

    Object.entries(queryObj).forEach(([key, value]) => {
      if (value === undefined || value === null) return;

      if (typeof value === 'string' && value.includes(',')) {
        this.queryOptions.where[key] = { in: value.split(',') };
      } else if (typeof value === 'string' && /^[><]=?/.test(value)) {
        const num = Number(value.replace(/^[><]=?/, ''));
        if (isNaN(num)) return;

        if (value.startsWith('>=')) this.queryOptions.where[key] = { gte: num };
        else if (value.startsWith('<='))
          this.queryOptions.where[key] = { lte: num };
        else if (value.startsWith('>'))
          this.queryOptions.where[key] = { gt: num };
        else if (value.startsWith('<'))
          this.queryOptions.where[key] = { lt: num };
      } else if (
        typeof value === 'string' &&
        (value === 'true' || value === 'false')
      ) {
        this.queryOptions.where[key] = value === 'true';
      } else if (!isNaN(Number(value))) {
        this.queryOptions.where[key] = Number(value);
      } else {
        this.queryOptions.where[key] = value;
      }
    });

    return this;
  }

  sort(): this {
    if (
      typeof this.queryString.sort === 'string' &&
      this.queryString.sort.trim()
    ) {
      this.queryOptions.orderBy = this.queryString.sort
        .split(',')
        .map((field) => {
          const isDesc = field.startsWith('-');
          return { [field.replace(/^-/, '')]: isDesc ? 'desc' : 'asc' };
        });
    } else {
      this.queryOptions.orderBy = [{ createdAt: 'desc' }];
    }
    return this;
  }

  limitFields(): this {
    if (
      typeof this.queryString.fields === 'string' &&
      this.queryString.fields.trim()
    ) {
      this.queryOptions.select = this.queryString.fields
        .split(',')
        .reduce<Record<string, boolean>>((acc, field) => {
          acc[field.trim()] = true;
          return acc;
        }, {});
    }
    return this;
  }

  search(): this {
    if (
      typeof this.queryString.search === 'string' &&
      this.queryString.search.trim() &&
      this.searchableFields.length > 0
    ) {
      const searchTerm = this.queryString.search.trim();
      const lowerSearch = searchTerm.toLowerCase();

      if (!this.queryOptions.where) this.queryOptions.where = {};

      const existingOR = Array.isArray(this.queryOptions.where.OR)
        ? this.queryOptions.where.OR
        : [];

      const orConditions = this.searchableFields.reduce<any[]>((acc, field) => {
        if (field === 'role') {
          const matchingRoles = Object.values(Role).filter((value: string) =>
            value.toLowerCase().includes(lowerSearch),
          ) as Role[];
          if (matchingRoles.length > 0) {
            acc.push({ [field]: { in: matchingRoles } });
          }
        } else {
          acc.push({
            [field]: { contains: searchTerm, mode: 'insensitive' },
          });
        }
        return acc;
      }, []);

      this.queryOptions.where.OR = [...existingOR, ...orConditions];
    }
    return this;
  }

  paginate(totalRecords: number): this {
    let page = Math.max(parseInt(this.queryString.page as string, 10) || 1, 1);
    const limit = Math.max(
      parseInt(this.queryString.limit as string, 10) || 50,
      1,
    );
    const totalPages = Math.max(Math.ceil(totalRecords / limit), 1);

    if (page > totalPages) page = totalPages;

    this.queryOptions.take = limit;
    this.queryOptions.skip = (page - 1) * limit;

    const hasNext = page < totalPages;
    const hasPrev = page > 1;

    this.paginationResult = {
      totalRecords,
      totalPages,
      currentPage: page,
      limit,
      hasNext,
      hasPrev,
      nextPage: hasNext ? page + 1 : null,
      prevPage: hasPrev ? page - 1 : null,
    };

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
      throw new HttpException(
        'Failed to execute query',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
