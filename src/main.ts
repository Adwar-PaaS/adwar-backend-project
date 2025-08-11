import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { RateLimitMiddleware } from './common/middlewares/rate-limit.middleware';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const port = parseInt(
    process.env.PORT || configService.get<string>('PORT') || '3000',
    10,
  );

  const allowedOrigins = configService.get<string[]>('CORS_ORIGINS') || [
    'http://localhost:5173',
  ];

  app.use(helmet());

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.use(cookieParser());

  app.useGlobalFilters(new HttpExceptionFilter());

  const rateLimitMiddleware = new RateLimitMiddleware();
  app.use(rateLimitMiddleware.use.bind(rateLimitMiddleware));

  await app.listen(port, '0.0.0.0');
  console.log(`🚀 App running on http://localhost:${port}`);
}

void bootstrap();
