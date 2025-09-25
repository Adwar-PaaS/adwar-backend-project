import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
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
import * as express from 'express';

function setupSecurity(app: NestExpressApplication, isProd: boolean) {
  app.use(
    helmet({
      contentSecurityPolicy: isProd
        ? {
            directives: {
              defaultSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              scriptSrc: ["'self'"],
              imgSrc: ["'self'", 'data:', 'https:'],
              connectSrc: ["'self'"],
              fontSrc: ["'self'", 'https:', 'data:'],
              objectSrc: ["'none'"],
              mediaSrc: ["'self'"],
              frameSrc: ["'none'"],
            },
          }
        : false,
      crossOriginEmbedderPolicy: false,
      hsts: isProd
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
    }),
  );
  app.use(helmet.hidePoweredBy());
  app.use(hpp({ whitelist: ['tags', 'categories'] }));
  app.use(compression());
}

function setupParsers(app: NestExpressApplication, isProd: boolean) {
  app.use(morgan(isProd ? 'combined' : 'dev'));
  app.use(
    express.json({
      limit: '1mb',
      verify: (req: any, _res, buf) => (req.rawBody = Buffer.from(buf)),
    }),
  );
  app.use(
    express.urlencoded({
      extended: true,
      limit: '1mb',
      verify: (req: any, _res, buf) => (req.rawBody = Buffer.from(buf)),
    }),
  );
  app.use(cookieParser());
}

function setupGlobal(app: NestExpressApplication) {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      validationError: { target: false, value: false },
      exceptionFactory: (errors) => {
        const messages = errors
          .map((err) =>
            err.constraints
              ? Object.values(err.constraints)
              : ['Validation failed'],
          )
          .flat();
        return new Error(`Validation failed: ${messages.join(', ')}`);
      },
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
}

async function setupSession(
  app: NestExpressApplication,
  configService: ConfigService,
  isProd: boolean,
  logger: Logger,
) {
  try {
    const redisService = app.get(RedisService);
    const redisClient = redisService.getConnection();

    const store = new (RedisStore as any)({
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
        rolling: true,
        cookie: {
          ...sessionCookieConfig,
          secure: isProd || configService.get<boolean>('ENABLE_HTTPS', false),
          maxAge:
            configService.get<number>('SESSION_MAX_AGE') ??
            sessionCookieConfig.maxAge,
        },
      }),
    );
  } catch (error) {
    logger.error('Failed to setup Redis session store:', error);
    throw error;
  }
}

function setupCors(app: NestExpressApplication, configService: ConfigService) {
  const allowedOrigins = configService
    .get<string>('CORS_ORIGINS')
    ?.split(',') || ['http://localhost:5173'];
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'x-csrf-token',
    ],
  });
}

function setupPerformanceLogger(app: NestExpressApplication, logger: Logger) {
  app.use((req: any, res: any, next: any) => {
    const start = process.hrtime.bigint();
    res.on('finish', () => {
      const duration = Number(process.hrtime.bigint() - start) / 1e6;
      if (duration > 1000) {
        logger.warn(
          `Slow request: ${req.method} ${req.originalUrl} - ${duration.toFixed(2)}ms`,
        );
      }
    });
    next();
  });
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const isProd = process.env.NODE_ENV === 'production';

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    abortOnError: false,
    cors: false,
    logger: isProd
      ? ['error', 'warn', 'log']
      : ['debug', 'error', 'warn', 'log'],
  });

  const configService = app.get(ConfigService);

  setupSecurity(app, isProd);
  setupParsers(app, isProd);
  setupGlobal(app);
  await setupSession(app, configService, isProd, logger);
  setupCors(app, configService);
  setupPerformanceLogger(app, logger);

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 App running on http://localhost:${port}`);
}

void bootstrap();
