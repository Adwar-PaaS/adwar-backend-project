import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly limiter = new RateLimiterMemory({
    points: 10, // 10 requests
    duration: 1, // per second
  });

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await this.limiter.consume(req.ip ?? 'unknown');
      next();
    } catch {
      res.status(429).json({
        statusCode: 429,
        message: 'Too Many Requests',
      });
    }
  }
}
