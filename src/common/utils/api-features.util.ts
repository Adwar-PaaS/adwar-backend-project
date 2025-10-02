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

export type PrismaFindManyArgs = Partial<
  Pick<
    Prisma.UserFindManyArgs,
    'where' | 'orderBy' | 'select' | 'take' | 'skip'
  >
>;

type FilterOperator = 'in' | 'not' | 'contains' | 'gt' | 'gte' | 'lt' | 'lte';
type FieldType = 'string' | 'number' | 'date' | 'boolean';

export interface ApiFeaturesOptions {
  maxLimit?: number;
  defaultLimit?: number;
  minLimit?: number;
  defaultSort?: Record<string, 'asc' | 'desc'>[];
  fieldTypes?: Record<string, FieldType>;
  enumFields?: Record<string, object>;
  relationConfigs?: Record<string, 'one' | 'many'>;
}

export class ApiFeatures<
  TModel extends {
    findMany: (args?: PrismaFindManyArgs) => Promise<TRecord[]>;
    count: (args?: { where?: Record<string, any> }) => Promise<number>;
    aggregate?: (args: any) => Promise<any>;
  },
  TRecord = any,
> {
  private readonly logger = new Logger(ApiFeatures.name);

  private readonly MAX_LIMIT: number;
  private readonly DEFAULT_LIMIT: number;
  private readonly MIN_LIMIT: number;
  private readonly DEFAULT_SORT: Record<string, 'asc' | 'desc'>[];
  private readonly FIELD_TYPES: Record<string, FieldType>;
  private readonly ENUM_FIELDS: Record<string, object>;
  private readonly RELATION_CONFIGS: Record<string, 'one' | 'many'>;

  private queryOptions: PrismaFindManyArgs = {};
  private paginationResult: PaginationResult | null = null;
  private totalRecordsCache: number | null = null;

  private fieldTypeCache = new Map<string, FieldType>();

  constructor(
    private readonly prismaModel: TModel,
    private readonly queryString: Record<string, string | undefined> = {},
    private readonly searchableFields: string[] = [],
    options: ApiFeaturesOptions = {},
  ) {
    this.MAX_LIMIT = options.maxLimit ?? 200;
    this.DEFAULT_LIMIT = options.defaultLimit ?? 50;
    this.MIN_LIMIT = options.minLimit ?? 1;
    this.DEFAULT_SORT = options.defaultSort ?? [{ createdAt: 'desc' }];
    this.FIELD_TYPES = options.fieldTypes ?? {};
    this.ENUM_FIELDS = options.enumFields ?? {};
    this.RELATION_CONFIGS = options.relationConfigs ?? {};
  }

  private inferFieldType(key: string): FieldType {
    if (this.fieldTypeCache.has(key)) return this.fieldTypeCache.get(key)!;
    if (this.FIELD_TYPES[key]) {
      this.fieldTypeCache.set(key, this.FIELD_TYPES[key]);
      return this.FIELD_TYPES[key];
    }

    const last = key.split('.').pop()!;
    let type: FieldType = 'string';
    if (/id$/i.test(last)) type = 'string';
    else if (/at$/i.test(last) || /date$/i.test(last)) type = 'date';
    else if (/^is[A-Z]/.test(last) || /^has/i.test(last)) type = 'boolean';
    else if (
      /count$/i.test(last) ||
      /number$/i.test(last) ||
      /price$/i.test(last)
    )
      type = 'number';

    this.fieldTypeCache.set(key, type);
    return type;
  }

  private normalizeFilters(filters: Record<string, any>) {
    return Object.fromEntries(
      Object.entries(filters).filter(
        ([, v]) => v !== undefined && v !== null && v !== '',
      ),
    );
  }

  private detectAndConvertSingle(value: string, fieldType?: FieldType) {
    const trimmed = value.trim();
    const lower = trimmed.toLowerCase();

    if (lower === 'true' || lower === 'false') return lower === 'true';
    if ((fieldType === 'number' || !fieldType) && /^-?\d*\.?\d+$/.test(trimmed))
      return Number(trimmed);

    if (
      (fieldType === 'date' || !fieldType) &&
      /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/.test(trimmed)
    ) {
      const date = new Date(trimmed);
      if (!isNaN(date.getTime())) return date;
    }

    return trimmed;
  }

  private parseFilterValue(key: string, raw: string): unknown {
    const value = raw.trim();
    const fieldType = this.inferFieldType(key);

    // list
    if (value.includes(',')) {
      const values = value
        .split(',')
        .map((v) => this.detectAndConvertSingle(v, fieldType))
        .filter((v) => v !== '');
      return values.length ? { in: values } : undefined;
    }

    // not equal
    if (value.startsWith('!=')) {
      return { not: this.detectAndConvertSingle(value.slice(2), fieldType) };
    }

    // operators
    const operatorMap: Record<string, (v: string) => any> = {
      '~': (v) => ({ contains: v, mode: 'insensitive' as const }),
      '^': (v) => ({ startsWith: v, mode: 'insensitive' as const }),
      $: (v) => ({ endsWith: v, mode: 'insensitive' as const }),
      '=': (v) => this.detectAndConvertSingle(v, fieldType),
    };
    if (operatorMap[value[0]]) {
      return operatorMap[value[0]](value.slice(1).trim());
    }

    // comparison
    const match = value.match(/^([<>]=?)(.+)$/);
    if (match) {
      const [, op, rawVal] = match;
      const parsed = this.detectAndConvertSingle(rawVal.trim(), fieldType);
      if (
        typeof parsed === 'string' &&
        ['number', 'date'].includes(fieldType || '')
      ) {
        throw new HttpException(
          `Invalid value for operator ${op} in filter "${key}"`,
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

    return this.detectAndConvertSingle(value, fieldType);
  }

  private buildNestedFilter(key: string, value: any) {
    const parts = key.split('.');
    return parts.reduceRight((acc: any, part: string) => {
      const relType = this.RELATION_CONFIGS[part];
      if (relType === 'many') return { [part]: { some: acc } };
      if (relType === 'one') return { [part]: { is: acc } };
      return { [part]: acc };
    }, value);
  }

  private deepMerge(
    target: Record<string, any> = {},
    source: Record<string, any> = {},
  ) {
    for (const [k, v] of Object.entries(source)) {
      if (
        v &&
        typeof v === 'object' &&
        !Array.isArray(v) &&
        typeof target[k] === 'object'
      ) {
        target[k] = this.deepMerge(target[k], v);
      } else {
        target[k] = v;
      }
    }
    return target;
  }

  filter(): this {
    const { page, sort, limit, fields, search, ...rawFilters } =
      this.queryString;
    const filters = this.normalizeFilters(rawFilters);

    for (const [key, rawVal] of Object.entries(filters)) {
      if (typeof rawVal !== 'string') continue;
      const parsed = this.parseFilterValue(key, rawVal);
      if (parsed !== undefined) {
        this.queryOptions.where = this.deepMerge(
          this.queryOptions.where,
          this.buildNestedFilter(key, parsed),
        );
      }
    }
    return this;
  }

  search(): this {
    const term = this.queryString.search?.trim();
    if (!term || !this.searchableFields.length) return this;

    const words = term.split(/\s+/).filter(Boolean);
    if (!words.length) return this;

    const or = this.searchableFields.flatMap((field) =>
      words
        .map((word) => {
          if (this.ENUM_FIELDS[field]) {
            const enumObj = this.ENUM_FIELDS[field];
            const lowerWord = word.toLowerCase();
            const matching = Object.values(enumObj).filter((val: any) =>
              val.toString().toLowerCase().includes(lowerWord),
            );
            return matching.length
              ? this.buildNestedFilter(field, { in: matching })
              : null;
          }
          const fieldType = this.inferFieldType(field);
          return fieldType === 'string'
            ? this.buildNestedFilter(field, {
                contains: word,
                mode: 'insensitive',
              })
            : this.buildNestedFilter(field, {
                equals: this.detectAndConvertSingle(word, fieldType),
              });
        })
        .filter(Boolean),
    );

    this.queryOptions.where = {
      ...(this.queryOptions.where ?? {}),
      OR: [...(this.queryOptions.where?.OR ?? []), ...or],
    };
    return this;
  }

  sort(): this {
    const str = this.queryString.sort?.trim();
    if (!str) {
      this.queryOptions.orderBy = [...this.DEFAULT_SORT];
      return this;
    }
    try {
      this.queryOptions.orderBy = str.split(',').map((f) => {
        const desc = f.startsWith('-');
        const name = f.replace(/^-/, '');
        return { [name]: desc ? 'desc' : 'asc' } as Record<
          string,
          'asc' | 'desc'
        >;
      });
    } catch {
      this.queryOptions.orderBy = [...this.DEFAULT_SORT];
    }
    return this;
  }

  limitFields(): this {
    const str = this.queryString.fields?.trim();
    if (!str) return this;

    const selected = str
      .split(',')
      .map((f) => f.trim())
      .filter(Boolean);
    if (selected.length) {
      this.queryOptions.select = selected.reduce(
        (acc, f) => ({ ...acc, [f]: true }),
        { id: true },
      );
    }
    return this;
  }

  private async calculateTotal(): Promise<number> {
    if (this.totalRecordsCache !== null) return this.totalRecordsCache;
    try {
      if (typeof this.prismaModel.aggregate === 'function') {
        const res = await this.prismaModel.aggregate({
          _count: { _all: true },
          where: this.queryOptions.where,
        });
        this.totalRecordsCache = res._count._all;
      } else {
        this.totalRecordsCache = await this.prismaModel.count({
          where: this.queryOptions.where,
        });
      }
      return this.totalRecordsCache ?? 0;
    } catch (err) {
      this.logger.error(`Total calculation failed: ${(err as Error).message}`);
      throw new HttpException(
        'Failed to calculate total records',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getCount(): Promise<number> {
    return this.calculateTotal();
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

    const totalPages = totalRecords ? Math.ceil(totalRecords / limit) : 0;
    const safePage = totalPages ? Math.min(page, totalPages) : 1;

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

  mergeFilter(extra: Record<string, any>): this {
    if (extra && Object.keys(extra).length) {
      this.queryOptions.where = this.deepMerge(this.queryOptions.where, extra);
      this.totalRecordsCache = null;
    }
    return this;
  }

  mergeSelect(extra: Record<string, boolean>): this {
    if (extra && Object.keys(extra).length) {
      this.queryOptions.select = {
        ...(this.queryOptions.select || {}),
        ...extra,
      };
    }
    return this;
  }

  getPagination(): PaginationResult | null {
    return this.paginationResult;
  }

  async query(
    withPagination = false,
  ): Promise<{ data: TRecord[]; pagination?: PaginationResult }> {
    if (withPagination && !this.paginationResult) await this.paginate();
    try {
      const data = await this.prismaModel.findMany(this.queryOptions);
      return withPagination
        ? { data, pagination: this.paginationResult! }
        : { data };
    } catch (err) {
      const msg = (err as Error).message || 'Unknown error';
      this.logger.error(`Error executing query: ${msg}`, (err as Error).stack);
      throw new HttpException(
        `Failed to execute query: ${msg}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  getQueryOptions(): PrismaFindManyArgs {
    return JSON.parse(JSON.stringify(this.queryOptions)); // immutable clone
  }

  reset(): this {
    this.queryOptions = {};
    this.paginationResult = null;
    this.totalRecordsCache = null;
    return this;
  }

  clone(): ApiFeatures<TModel, TRecord> {
    const cloned = new ApiFeatures(
      this.prismaModel,
      { ...this.queryString },
      [...this.searchableFields],
      {
        maxLimit: this.MAX_LIMIT,
        defaultLimit: this.DEFAULT_LIMIT,
        minLimit: this.MIN_LIMIT,
        defaultSort: this.DEFAULT_SORT,
        fieldTypes: this.FIELD_TYPES,
        enumFields: this.ENUM_FIELDS,
        relationConfigs: this.RELATION_CONFIGS,
      },
    );
    cloned.queryOptions = JSON.parse(JSON.stringify(this.queryOptions));
    cloned.paginationResult = this.paginationResult
      ? { ...this.paginationResult }
      : null;
    cloned.totalRecordsCache = this.totalRecordsCache;
    return cloned;
  }
}
