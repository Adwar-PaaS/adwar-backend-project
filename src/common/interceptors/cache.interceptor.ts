import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../../db/redis/redis.service';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
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

    if (!cacheMeta) {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest();
    const cacheKey =
      typeof cacheMeta.key === 'function' ? cacheMeta.key(req) : cacheMeta.key;

    if (!cacheKey) {
      this.logger.warn('Skipping cache: empty key');
      return next.handle();
    }

    return new Observable((subscriber) => {
      this.redisService.get(cacheKey).then((cached) => {
        if (cached) {
          this.logger.log(`Cache hit [key=${cacheKey}]`);
          subscriber.next(cached);
          subscriber.complete();
        } else {
          this.logger.log(`Cache miss [key=${cacheKey}]`);
          next
            .handle()
            .pipe(
              tap((result) => {
                this.redisService.set(cacheKey, result, cacheMeta.ttl);
                this.logger.log(
                  `Cache set [key=${cacheKey}, ttl=${cacheMeta.ttl}s]`,
                );
              }),
            )
            .subscribe(subscriber);
        }
      });
    });
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

    if (!keys || keys.length === 0) {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest();

    return next.handle().pipe(
      tap(async () => {
        for (const key of keys) {
          let resolvedKey: string | null = null;

          try {
            resolvedKey = typeof key === 'function' ? key(req) : key;
          } catch (err) {
            this.logger.error(`Failed to resolve key from function`, err);
          }

          if (!resolvedKey || resolvedKey.trim().length === 0) {
            this.logger.warn(`Skipping invalid cache key: ${key}`);
            continue;
          }

          if (resolvedKey.includes('*')) {
            await this.redisService.delByPattern(resolvedKey);
            this.logger.log(
              `Cache invalidated by pattern [pattern=${resolvedKey}]`,
            );
          } else {
            await this.redisService.del(resolvedKey);
            this.logger.log(`Cache invalidated [key=${resolvedKey}]`);
          }
        }
      }),
    );
  }
}
