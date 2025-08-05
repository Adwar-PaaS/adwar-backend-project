import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const port = configService.get<number>('PORT', 3000);
  const allowedOrigins = configService.get<string[]>('CORS_ORIGINS') || [
    'http://localhost:3000',
  ];

  app.use(helmet());

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  const rateLimiter = new RateLimiterMemory({
    points: 10, // 10 requests
    duration: 1, // per 1 second
  });

  app.use(
    async (
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      try {
        await rateLimiter.consume(req.ip ?? 'unknown');
        next();
      } catch {
        res.status(429).json({
          statusCode: 429,
          message: 'Too Many Requests',
        });
      }
    },
  );

  await app.listen(port);
  console.log(` App is running on http://localhost:${port}`);
}

void bootstrap();
