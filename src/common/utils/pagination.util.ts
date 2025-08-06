import {
  PaginationMeta,
  PaginationResult,
} from '../interfaces/pagination-options.interface';

export class PaginationUtil {
  static sanitize(page = 1, limit = 10): { page: number; limit: number } {
    return {
      page: Math.max(Number(page), 1),
      limit: Math.max(Number(limit), 1),
    };
  }

  private static buildMeta(meta: Partial<PaginationMeta>): PaginationMeta {
    return {
      strategy: meta.strategy!,
      page: meta.page,
      limit: meta.limit!,
      total: meta.total,
      totalPages: meta.totalPages,
      hasNext: meta.hasNext ?? false,
      hasPrev: meta.hasPrev ?? false,
      nextCursor: meta.nextCursor ?? null,
      prevCursor: meta.prevCursor ?? null,
    };
  }

  static offset<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
  ): PaginationResult<T> {
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      meta: this.buildMeta({
        strategy: 'offset',
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      }),
    };
  }

  static cursor<T>(params: {
    data: T[];
    limit?: number;
    getCursor: (item: T) => string;
    requestedCursor?: string;
    alreadySliced?: boolean;
  }): PaginationResult<T> {
    const {
      data,
      getCursor,
      requestedCursor,
      alreadySliced = false,
      limit = 10,
    } = params;

    const safeLimit = Math.max(Number(limit), 1);
    const hasExtraItem = data.length > safeLimit;
    const sliced = alreadySliced ? data : data.slice(0, safeLimit);

    return {
      data: sliced,
      meta: this.buildMeta({
        strategy: 'cursor',
        limit: safeLimit,
        hasNext: hasExtraItem,
        hasPrev: Boolean(requestedCursor),
        nextCursor: hasExtraItem ? getCursor(sliced.at(-1)!) : null,
        prevCursor: requestedCursor ? getCursor(sliced[0]) : null,
      }),
    };
  }
}
