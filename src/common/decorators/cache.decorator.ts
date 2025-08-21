import { SetMetadata, applyDecorators } from '@nestjs/common';

export type CacheKey = string | ((req: any) => string);

export interface CacheOptions {
  key: CacheKey;
  ttl?: number;
}

export function Cacheable(key: CacheKey, ttl = 60) {
  return applyDecorators(SetMetadata('cacheable', { key, ttl }));
}

export function InvalidateCache(...keys: CacheKey[]) {
  return applyDecorators(SetMetadata('invalidateCache', keys));
}
