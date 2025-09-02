import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { RedisStore } from 'connect-redis';
import { RedisService } from './db/redis/redis.service';
import { sessionCookieConfig } from './config/cookie.config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  app.use(helmet());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  app.use(cookieParser());

  app.set('trust proxy', 1);

  const allowedOrigins = configService.get<string[]>('CORS_ORIGINS') || [
    'http://localhost:5173',
  ];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked for origin: ${origin}`), false);
      }
    },
    credentials: true,
  });

  const redisService = app.get(RedisService);
  const redisClient = redisService.getConnection();

  const store = new RedisStore({
    client: redisClient,
    prefix: 'sess:',
  });

  app.use(
    session({
      store,
      name: configService.get<string>('SESSION_COOKIE_NAME', 'sid'),
      secret: configService.get<string>('SESSION_SECRET', 'changeme'),
      resave: false,
      saveUninitialized: false,
      rolling: false,
      cookie: {
        ...sessionCookieConfig,
        secure: configService.get<string>('NODE_ENV') === 'production',
      },
    }),
  );

  const port = configService.get<number>('PORT', 3000);

  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 App running on http://localhost:${port}`);
}

void bootstrap();
