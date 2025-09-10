import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import hpp from 'hpp';
import compression from 'compression';
import morgan from 'morgan';
import { RedisStore } from 'connect-redis';
import { RedisService } from './db/redis/redis.service';
import { sessionCookieConfig } from './config/cookie.config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // const app = await NestFactory.create<NestExpressApplication>(AppModule, {
  //   bufferLogs: true,
  // });

  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');
  const isProd = configService.get<string>('NODE_ENV') === 'production';

  app.use(
    helmet({
      contentSecurityPolicy: isProd
        ? {
            directives: {
              defaultSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              scriptSrc: ["'self'"],
              imgSrc: ["'self'", 'data:', 'https:'],
            },
          }
        : false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(helmet.hidePoweredBy());

  app.use(hpp());
  app.use(compression());
  app.use(morgan(isProd ? 'combined' : 'dev'));

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  app.use(cookieParser());

  if (isProd) {
    app.set('trust proxy', 1);
  }

  const allowedOrigins = configService
    .get<string>('CORS_ORIGINS')
    ?.split(',') || ['http://localhost:5173'];

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
        secure: isProd,
      },
    }),
  );

  const port = configService.get<number>('PORT', 3000);

  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 App running on http://localhost:${port}`);
}

void bootstrap();
