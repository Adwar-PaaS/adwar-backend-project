// Import core NestJS decorators and interfaces for creating interceptors
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
// Import Reflector to read metadata from decorators
import { Reflector } from '@nestjs/core';
// Import custom Redis service for caching operations
import { RedisService } from '../../db/redis/redis.service';
// Import RxJS Observable for handling async operations
import { Observable } from 'rxjs';
// Import RxJS tap operator for side effects
import { tap } from 'rxjs/operators';
// Import custom type for cache keys
import { CacheKey } from '../decorators/cache.decorator';

// Mark class as injectable to allow dependency injection
@Injectable()
// Export CacheInterceptor class that implements NestInterceptor interface
export class CacheInterceptor implements NestInterceptor {
  // Constructor with dependency injection for Redis service and Reflector
  constructor(
    // Inject Redis service for cache operations
    private readonly redisService: RedisService,
    // Inject Reflector to read decorator metadata
    private readonly reflector: Reflector,
  ) {}

  // Main intercept method that handles caching logic
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Get cache metadata from the @Cacheable decorator on the method
    const cacheMeta = this.reflector.get<{
      key: CacheKey;
      ttl: number;
    }>('cacheable', context.getHandler());

    // If no cache metadata found, proceed without caching
    if (!cacheMeta) {
      return next.handle();
    }

    // Get the HTTP request object from execution context
    const req = context.switchToHttp().getRequest();
    // Resolve the cache key (could be a string or function that generates one)
    const cacheKey =
      typeof cacheMeta.key === 'function' ? cacheMeta.key(req) : cacheMeta.key;

    // Create a new Observable to handle cache logic
    return new Observable((subscriber) => {
      // Check Redis for cached data using the resolved cache key
      this.redisService.get(cacheKey).then((cached) => {
        // If cached data exists, return it immediately without executing the method
        if (cached) {
          subscriber.next(cached);
          subscriber.complete();
        } else {
          // If no cached data, execute the original method
          next
            .handle()
            .pipe(
              // Use tap operator to cache the result after method execution
              tap((result) =>
                // Store the result in Redis with the specified TTL
                this.redisService.set(cacheKey, result, cacheMeta.ttl),
              ),
            )
            // Subscribe to the result and pass it to the original subscriber
            .subscribe(subscriber);
        }
      });
    });
  }
}

// Mark class as injectable for dependency injection
@Injectable()
// Export InvalidateCacheInterceptor class that implements NestInterceptor interface
export class InvalidateCacheInterceptor implements NestInterceptor {
  // Constructor with dependency injection for Redis service and Reflector
  constructor(
    // Inject Redis service for cache operations
    private readonly redisService: RedisService,
    // Inject Reflector to read decorator metadata
    private readonly reflector: Reflector,
  ) {}

  // Main intercept method that handles cache invalidation logic
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Get cache invalidation keys from the @InvalidateCache decorator
    const keys = this.reflector.get<CacheKey[]>(
      'invalidateCache',
      context.getHandler(),
    );

    // If no invalidation keys found, proceed without cache invalidation
    if (!keys || keys.length === 0) {
      return next.handle();
    }

    // Get the HTTP request object from execution context
    const req = context.switchToHttp().getRequest();

    // Execute the original method first, then handle cache invalidation
    return next.handle().pipe(
      // Use tap operator to perform cache invalidation after successful method execution
      tap(async () => {
        // Loop through each cache key that needs to be invalidated
        for (const key of keys) {
          // Resolve the cache key (could be a string or function that generates one)
          const resolvedKey = typeof key === 'function' ? key(req) : key;

          // Check if the key contains wildcards for pattern matching
          if (resolvedKey.includes('*')) {
            // Delete all keys matching the pattern (e.g., 'users:*' deletes all user-related cache)
            await this.redisService.delByPattern(resolvedKey);
          } else {
            // Delete the specific cache key
            await this.redisService.del(resolvedKey);
          }
        }
      }),
    );
  }
}
