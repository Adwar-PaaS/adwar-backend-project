import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../../db/redis/redis.service';
import { Observable, from, of, throwError } from 'rxjs';
import { switchMap, tap, catchError } from 'rxjs/operators';
import { CacheKey } from '../decorators/cache.decorator';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CacheInterceptor.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const cacheMeta = this.reflector.get<{ key: CacheKey; ttl: number }>(
      'cacheable',
      context.getHandler(),
    );

    if (!cacheMeta) return next.handle();

    const req = context.switchToHttp().getRequest();
    const cacheKey =
      typeof cacheMeta.key === 'function' ? cacheMeta.key(req) : cacheMeta.key;

    if (!cacheKey) {
      this.logger.warn('Skipping cache: empty key');
      return next.handle();
    }

    return from(this.redisService.get(cacheKey)).pipe(
      switchMap((cached) => {
        if (cached) {
          this.logger.log(`Cache hit [key=${cacheKey}]`);
          return of(cached);
        }
        this.logger.log(`Cache miss [key=${cacheKey}]`);
        return next.handle().pipe(
          tap(async (result) => {
            try {
              await this.redisService.set(cacheKey, result, cacheMeta.ttl);
              this.logger.log(
                `Cache set [key=${cacheKey}, ttl=${cacheMeta.ttl}s]`,
              );
            } catch (err) {
              this.logger.error(
                `Cache write failed [key=${cacheKey}]:`,
                err as Error,
              );
            }
          }),
        );
      }),
      catchError((err) => {
        this.logger.error(`Handler error [key=${cacheKey}]`, err as Error);
        return throwError(() => err);
      }),
    );
  }
}

@Injectable()
export class InvalidateCacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(InvalidateCacheInterceptor.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const keys = this.reflector.get<CacheKey[]>(
      'invalidateCache',
      context.getHandler(),
    );

    if (!keys?.length) return next.handle();

    const req = context.switchToHttp().getRequest();

    return next.handle().pipe(
      tap(async () => {
        for (const key of keys) {
          let resolvedKey: string | null = null;
          try {
            resolvedKey = typeof key === 'function' ? key(req) : key;
          } catch (err) {
            this.logger.error('Failed to resolve key from function', err);
          }

          if (!resolvedKey || !resolvedKey.trim()) {
            this.logger.warn(`Skipping invalid cache key: ${key}`);
            continue;
          }

          try {
            if (resolvedKey.includes('*')) {
              await this.redisService.delByPattern(resolvedKey);
              this.logger.log(
                `Cache invalidated by pattern [pattern=${resolvedKey}]`,
              );
            } else {
              await this.redisService.del(resolvedKey);
              this.logger.log(`Cache invalidated [key=${resolvedKey}]`);
            }
          } catch (err) {
            this.logger.error(
              `Failed to invalidate [key=${resolvedKey}]`,
              err as Error,
            );
          }
        }
      }),
    );
  }
}
