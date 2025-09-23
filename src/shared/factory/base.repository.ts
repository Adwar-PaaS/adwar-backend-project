import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { ApiError } from '../../common/exceptions/api-error.exception';
import {
  ApiFeatures,
  PaginationResult,
} from '../../common/utils/api-features.util';
import {
  sanitizeUsers,
  sanitizeUser,
} from '../../common/utils/sanitize-user.util';
import { PrismaService } from 'src/db/prisma/prisma.service';
import { RedisService } from 'src/db/redis/redis.service';

@Injectable()
export class BaseRepository<
  T extends { id: string; password?: string; deletedAt?: Date | null },
> {
  protected readonly logger = new Logger(BaseRepository.name);

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly redis: RedisService,
    private readonly modelKey: keyof PrismaService,
    protected readonly searchableFields: string[] = [],
    protected readonly defaultInclude: Prisma.Prisma__Pick<any, any> = {},
    protected readonly useSoftDelete = true,
    private readonly cacheTTL = 60,
  ) {}

  private get delegate() {
    return this.prisma[this.modelKey] as any;
  }

  private async cacheGet<T = any>(key: string): Promise<T | null> {
    return this.redis.get<T>(key);
  }

  private async cacheSet(key: string, value: any, ttl = this.cacheTTL) {
    await this.redis.set(key, value, ttl);
  }

  private async cacheDel(key: string) {
    await this.redis.del(key);
  }

  private async cacheDelByPattern(pattern: string) {
    await this.redis.delByPattern(pattern);
  }

  private buildCacheKey(action: string, extra: any = {}): string {
    return `${String(this.modelKey)}:${action}:${JSON.stringify(extra)}`;
  }

  private handleError(action: string, error: any, id?: string): never {
    if (error?.code === 'P2025') {
      throw new ApiError(
        id ? `No record found with id ${id}` : 'Record not found',
        HttpStatus.NOT_FOUND,
      );
    }

    this.logger.error(
      `Error during ${action}: ${error?.message || error}`,
      error?.stack,
    );

    throw new ApiError(`Failed to ${action}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }

  private async runTransaction<R>(
    cb: (
      tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$use'>,
    ) => Promise<R>,
  ): Promise<R> {
    try {
      return await this.prisma.$transaction(cb);
    } catch (error) {
      this.logger.error(`Transaction failed: ${error?.message}`, error?.stack);
      throw new ApiError(
        'Transaction failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async create(data: any, include: any = this.defaultInclude): Promise<T> {
    return this.runTransaction(async (tx) => {
      try {
        const newDoc = await (tx[this.modelKey] as any).create({
          data,
          include,
        });
        await this.cacheDelByPattern(`${String(this.modelKey)}:*`);
        return sanitizeUser(newDoc) as T;
      } catch (error) {
        this.handleError('create', error);
      }
    });
  }

  async bulkInsert(
    data: any[],
    include: any = this.defaultInclude,
  ): Promise<T[]> {
    return this.runTransaction(async (tx) => {
      try {
        await (tx[this.modelKey] as any).createMany({
          data,
          skipDuplicates: true,
        });

        const ids = data.map((d) => d.id).filter(Boolean);
        const inserted = await (tx[this.modelKey] as any).findMany({
          where: {
            id: { in: ids },
            ...(this.useSoftDelete ? { deletedAt: null } : {}),
          },
          include,
        });

        for (const id of ids) {
          await this.cacheDel(
            `${String(this.modelKey)}:findOne:{"id":"${id}"}`,
          );
        }

        await this.cacheDelByPattern(`${String(this.modelKey)}:findMany*`);
        await this.cacheDelByPattern(`${String(this.modelKey)}:findAll*`);

        return sanitizeUsers(inserted) as T[];
      } catch (error) {
        this.handleError('bulk insert', error);
      }
    });
  }

  async update(
    id: string,
    data: any,
    include: any = this.defaultInclude,
  ): Promise<T> {
    return this.runTransaction(async (tx) => {
      try {
        const updated = await (tx[this.modelKey] as any).update({
          where: { id },
          data,
          include,
        });

        await this.cacheDel(`${String(this.modelKey)}:findOne:${id}`);
        await this.cacheDelByPattern(`${String(this.modelKey)}:*`);
        return sanitizeUser(updated) as T;
      } catch (error) {
        this.handleError('update', error, id);
      }
    });
  }

  async updateMany(
    ids: string[],
    data: any,
    include: any = this.defaultInclude,
  ): Promise<T[]> {
    return this.runTransaction(async (tx) => {
      try {
        await (tx[this.modelKey] as any).updateMany({
          where: { id: { in: ids } },
          data,
        });

        const updated = await (tx[this.modelKey] as any).findMany({
          where: {
            id: { in: ids },
            ...(this.useSoftDelete ? { deletedAt: null } : {}),
          },
          include,
        });

        for (const id of ids) {
          await this.cacheDel(
            `${String(this.modelKey)}:findOne:{"id":"${id}"}`,
          );
        }

        await this.cacheDelByPattern(`${String(this.modelKey)}:findMany*`);
        await this.cacheDelByPattern(`${String(this.modelKey)}:findAll*`);

        return sanitizeUsers(updated) as T[];
      } catch (error) {
        this.handleError('update many', error);
      }
    });
  }

  async delete(id: string): Promise<void> {
    return this.runTransaction(async (tx) => {
      try {
        if (this.useSoftDelete) {
          await (tx[this.modelKey] as any).update({
            where: { id },
            data: { deletedAt: new Date() },
          });
        } else {
          await (tx[this.modelKey] as any).delete({ where: { id } });
        }

        await this.cacheDel(`${String(this.modelKey)}:findOne:${id}`);
        await this.cacheDelByPattern(`${String(this.modelKey)}:*`);
      } catch (error) {
        this.handleError('delete', error, id);
      }
    });
  }

  async findOne(
    where: Record<string, any>,
    include: any = this.defaultInclude,
  ): Promise<T> {
    const cacheKey = this.buildCacheKey('findOne', where);
    const cached = await this.cacheGet<T>(cacheKey);
    if (cached) return cached;

    try {
      const finder = (this.delegate.findUnique ?? this.delegate.findFirst).bind(
        this.delegate,
      );
      const doc = await finder({ where, include });

      if (!doc || (this.useSoftDelete && doc.deletedAt)) {
        throw new ApiError(
          `No record found with criteria ${JSON.stringify(where)}`,
          HttpStatus.NOT_FOUND,
        );
      }

      const sanitized = sanitizeUser(doc) as T;
      await this.cacheSet(cacheKey, sanitized);
      return sanitized;
    } catch (error) {
      this.handleError('find one', error);
    }
  }

  async findMany(
    where: Record<string, any> = {},
    include: any = this.defaultInclude,
  ): Promise<T[]> {
    const cacheKey = this.buildCacheKey('findMany', where);
    const cached = await this.cacheGet<T[]>(cacheKey);
    if (cached) return cached;

    try {
      const docs = await this.delegate.findMany({
        where: { ...where, ...(this.useSoftDelete ? { deletedAt: null } : {}) },
        include,
      });

      const sanitized = sanitizeUsers(docs) as T[];
      await this.cacheSet(cacheKey, sanitized);
      return sanitized;
    } catch (error) {
      this.handleError('find many', error);
    }
  }

  async findAll(
    queryString: Record<string, any> = {},
    where: Record<string, any> = {},
    include: Record<string, any> = this.defaultInclude,
  ): Promise<{ items: T[] } & Partial<PaginationResult>> {
    const cacheKey = this.buildCacheKey('findAll', { queryString, where });
    const cached = await this.cacheGet<
      { items: T[] } & Partial<PaginationResult>
    >(cacheKey);
    if (cached) return cached;

    try {
      const apiFeatures = new ApiFeatures(
        this.delegate,
        queryString,
        this.searchableFields,
      )
        .filter()
        .search()
        .mergeFilter({
          ...where,
          ...(this.useSoftDelete ? { deletedAt: null } : {}),
        })
        .sort()
        .limitFields();

      await apiFeatures.paginate();
      apiFeatures.include(include);

      const { data, pagination } = await apiFeatures.query();

      const result = {
        items: sanitizeUsers(data) as T[],
        ...(pagination ?? {}),
      };

      await this.cacheSet(cacheKey, result);
      return result;
    } catch (error) {
      this.handleError('find all', error);
    }
  }
}

// import { HttpStatus, Injectable, Logger } from '@nestjs/common';
// import { Prisma, PrismaClient } from '@prisma/client';
// import { ApiError } from '../../common/exceptions/api-error.exception';
// import {
//   ApiFeatures,
//   PaginationResult,
// } from '../../common/utils/api-features.util';
// import {
//   sanitizeUsers,
//   sanitizeUser,
// } from '../../common/utils/sanitize-user.util';
// import { PrismaService } from 'src/db/prisma/prisma.service';

// @Injectable()
// export class BaseRepository<
//   T extends { id: string; password?: string; deletedAt?: Date | null },
// > {
//   protected readonly logger = new Logger(BaseRepository.name);

//   constructor(
//     protected readonly prisma: PrismaService,
//     private readonly modelKey: keyof PrismaService,
//     protected readonly searchableFields: string[] = [],
//     protected readonly defaultInclude: Prisma.Prisma__Pick<any, any> = {},
//     protected readonly useSoftDelete = true,
//   ) {}

//   private get delegate() {
//     return this.prisma[this.modelKey] as any;
//   }

//   private handleError(action: string, error: any, id?: string): never {
//     if (error?.code === 'P2025') {
//       throw new ApiError(
//         id ? `No record found with id ${id}` : 'Record not found',
//         HttpStatus.NOT_FOUND,
//       );
//     }

//     this.logger.error(
//       `Error during ${action}: ${error?.message || error}`,
//       error?.stack,
//     );

//     throw new ApiError(`Failed to ${action}`, HttpStatus.INTERNAL_SERVER_ERROR);
//   }

//   private async runTransaction<R>(
//     cb: (
//       tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$use'>,
//     ) => Promise<R>,
//   ): Promise<R> {
//     try {
//       return await this.prisma.$transaction(cb);
//     } catch (error) {
//       this.logger.error(`Transaction failed: ${error?.message}`, error?.stack);
//       throw new ApiError(
//         'Transaction failed',
//         HttpStatus.INTERNAL_SERVER_ERROR,
//       );
//     }
//   }

//   async create(data: any, include: any = this.defaultInclude): Promise<T> {
//     return this.runTransaction(async (tx) => {
//       try {
//         const newDoc = await (tx[this.modelKey] as any).create({
//           data,
//           include,
//         });
//         return sanitizeUser(newDoc) as T;
//       } catch (error) {
//         this.handleError('create', error);
//       }
//     });
//   }

//   async bulkInsert(
//     data: any[],
//     include: any = this.defaultInclude,
//   ): Promise<T[]> {
//     return this.runTransaction(async (tx) => {
//       try {
//         await (tx[this.modelKey] as any).createMany({
//           data,
//           skipDuplicates: true,
//         });

//         const inserted = await (tx[this.modelKey] as any).findMany({
//           where: {
//             id: { in: data.map((d) => d.id).filter(Boolean) },
//             ...(this.useSoftDelete ? { deletedAt: null } : {}),
//           },
//           include,
//         });

//         return sanitizeUsers(inserted) as T[];
//       } catch (error) {
//         this.handleError('bulk insert', error);
//       }
//     });
//   }

//   async update(
//     id: string,
//     data: any,
//     include: any = this.defaultInclude,
//   ): Promise<T> {
//     return this.runTransaction(async (tx) => {
//       try {
//         const updated = await (tx[this.modelKey] as any).update({
//           where: { id },
//           data,
//           include,
//         });
//         return sanitizeUser(updated) as T;
//       } catch (error) {
//         this.handleError('update', error, id);
//       }
//     });
//   }

//   async updateMany(
//     ids: string[],
//     data: any,
//     include: any = this.defaultInclude,
//   ): Promise<T[]> {
//     return this.runTransaction(async (tx) => {
//       try {
//         await (tx[this.modelKey] as any).updateMany({
//           where: { id: { in: ids } },
//           data,
//         });

//         const updated = await (tx[this.modelKey] as any).findMany({
//           where: {
//             id: { in: ids },
//             ...(this.useSoftDelete ? { deletedAt: null } : {}),
//           },
//           include,
//         });

//         return sanitizeUsers(updated) as T[];
//       } catch (error) {
//         this.handleError('update many', error);
//       }
//     });
//   }

//   async delete(id: string): Promise<void> {
//     return this.runTransaction(async (tx) => {
//       try {
//         if (this.useSoftDelete) {
//           await (tx[this.modelKey] as any).update({
//             where: { id },
//             data: { deletedAt: new Date() },
//           });
//         } else {
//           await (tx[this.modelKey] as any).delete({ where: { id } });
//         }
//       } catch (error) {
//         this.handleError('delete', error, id);
//       }
//     });
//   }

//   async findOne(
//     where: Record<string, any>,
//     include: any = this.defaultInclude,
//   ): Promise<T> {
//     try {
//       const finder = (this.delegate.findUnique ?? this.delegate.findFirst).bind(
//         this.delegate,
//       );
//       const doc = await finder({ where, include });

//       if (!doc || (this.useSoftDelete && doc.deletedAt)) {
//         throw new ApiError(
//           `No record found with criteria ${JSON.stringify(where)}`,
//           HttpStatus.NOT_FOUND,
//         );
//       }

//       return sanitizeUser(doc) as T;
//     } catch (error) {
//       this.handleError('find one', error);
//     }
//   }

//   async findMany(
//     where: Record<string, any> = {},
//     include: Record<string, any> = this.defaultInclude,
//   ): Promise<T[]> {
//     try {
//       const docs = await this.delegate.findMany({
//         where: {
//           ...where,
//           ...(this.useSoftDelete ? { deletedAt: null } : {}),
//         },
//         include,
//       });

//       return sanitizeUsers(docs) as T[];
//     } catch (error) {
//       this.handleError('find many', error);
//     }
//   }

//   async findAll(
//     queryString: Record<string, any> = {},
//     where: Record<string, any> = {},
//     include: Record<string, any> = this.defaultInclude,
//   ): Promise<{ items: T[] } & Partial<PaginationResult>> {
//     try {
//       const apiFeatures = new ApiFeatures(
//         this.delegate,
//         queryString,
//         this.searchableFields,
//       )
//         .filter()
//         .search()
//         .mergeFilter({
//           ...where,
//           ...(this.useSoftDelete ? { deletedAt: null } : {}),
//         })
//         .sort()
//         .limitFields();

//       await apiFeatures.paginate();
//       apiFeatures.include(include);

//       const { data, pagination } = await apiFeatures.query();

//       return {
//         items: sanitizeUsers(data) as T[],
//         ...(pagination ?? {}),
//       };
//     } catch (error) {
//       this.handleError('find all', error);
//     }
//   }
// }
