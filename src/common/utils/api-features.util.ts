import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';

interface PaginationResult {
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
    private readonly queryString: Record<string, any>,
  ) {}

  filter(): this {
    const queryObj = { ...this.queryString };
    const excludeFields = ['page', 'sort', 'limit', 'fields', 'search'];
    excludeFields.forEach((field) => delete queryObj[field]);

    Object.entries(queryObj).forEach(([key, value]) => {
      if (value.includes(',')) {
        this.queryOptions.where[key] = { in: value.split(',') };
      } else if (/^[><]=?/.test(value)) {
        const num = Number(value.replace(/^[><]=?/, ''));
        if (value.startsWith('>=')) this.queryOptions.where[key] = { gte: num };
        else if (value.startsWith('<='))
          this.queryOptions.where[key] = { lte: num };
        else if (value.startsWith('>'))
          this.queryOptions.where[key] = { gt: num };
        else if (value.startsWith('<'))
          this.queryOptions.where[key] = { lt: num };
      } else {
        this.queryOptions.where[key] = value;
      }
    });

    return this;
  }

  sort(): this {
    if (this.queryString.sort) {
      this.queryOptions.orderBy = this.queryString.sort
        .split(',')
        .map((field: string) => {
          const isDesc = field.startsWith('-');
          return { [field.replace(/^-/, '')]: isDesc ? 'desc' : 'asc' };
        });
    } else {
      this.queryOptions.orderBy = [{ createdAt: 'desc' }];
    }
    return this;
  }

  limitFields(): this {
    if (this.queryString.fields) {
      this.queryOptions.select = this.queryString.fields
        .split(',')
        .reduce((acc: Record<string, boolean>, field: string) => {
          acc[field] = true;
          return acc;
        }, {});
    }
    return this;
  }

  search(): this {
    if (this.queryString.search) {
      const searchTerm = this.queryString.search;
      this.queryOptions.where = {
        ...this.queryOptions.where,
        OR: [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } },
          { keywords: { has: searchTerm } }, // if keywords is an array
        ],
      };
    }
    return this;
  }

  paginate(totalRecords: number): this {
    let page = Math.max(parseInt(this.queryString.page, 10) || 1, 1);
    const limit = Math.max(parseInt(this.queryString.limit, 10) || 50, 1);
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
    } catch (error) {
      this.logger.error(`Error executing query: ${error.message}`);
      throw new HttpException(
        'Failed to execute query',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
