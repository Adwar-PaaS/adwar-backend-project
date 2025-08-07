import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { RateLimitMiddleware } from './common/middlewares/rate-limit.middleware';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';
import helmet from 'helmet';

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

  app.useGlobalFilters(new HttpExceptionFilter());

  app.useGlobalInterceptors(new TimeoutInterceptor());

  const rateLimitMiddleware = new RateLimitMiddleware();
  app.use(rateLimitMiddleware.use.bind(rateLimitMiddleware));

  await app.listen(port, '0.0.0.0');
  console.log(`🚀 App running on http://localhost:${port}`);
}

void bootstrap();
