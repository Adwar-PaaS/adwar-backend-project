import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../../db/redis/redis.service';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheKey } from '../decorators/cache.decorator';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private readonly redisService: RedisService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const cacheMeta = this.reflector.get<{
      key: CacheKey;
      ttl: number;
    }>('cacheable', context.getHandler());

    if (!cacheMeta) {
      return next.handle();
    }

    const req = context.switchToHttp().getRequest();
    const cacheKey =
      typeof cacheMeta.key === 'function' ? cacheMeta.key(req) : cacheMeta.key;

    return new Observable((subscriber) => {
      this.redisService.get(cacheKey).then((cached) => {
        if (cached) {
          subscriber.next(cached);
          subscriber.complete();
        } else {
          next
            .handle()
            .pipe(
              tap((result) =>
                this.redisService.set(cacheKey, result, cacheMeta.ttl),
              ),
            )
            .subscribe(subscriber);
        }
      });
    });
  }
}

@Injectable()
export class InvalidateCacheInterceptor implements NestInterceptor {
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
          const resolvedKey = typeof key === 'function' ? key(req) : key;

          if (resolvedKey.includes('*')) {
            await this.redisService.delByPattern(resolvedKey);
          } else {
            await this.redisService.del(resolvedKey);
          }
        }
      }),
    );
  }
}
