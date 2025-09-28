import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { RedisStore } from 'connect-redis';
import { RedisService } from './db/redis/redis.service';
import { sessionCookieConfig } from './config/cookie.config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import * as express from 'express';
import { ClusterService } from './common/services/cluster.service';
import cluster from 'node:cluster';

function setupSecurity(app: NestExpressApplication, isProd: boolean) {
  app.use(helmet.hidePoweredBy());
  app.use(helmet.frameguard({ action: 'deny' }));
  if (isProd) {
    app.use(
      helmet.hsts({ maxAge: 31536000, includeSubDomains: true, preload: true }),
    );
  }
}

function setupParsers(app: NestExpressApplication, isProd: boolean) {
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

  if (isProd) app.set('trust proxy', 1);
}

function setupGlobal(app: NestExpressApplication) {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: false,
      validationError: { target: false, value: false },
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
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked for origin: ${origin}`), false);
      }
    },
    credentials: true,
  });
}

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const isProd = process.env.NODE_ENV === 'production';

  if (cluster.isPrimary) {
    const clusterService = new ClusterService();
    clusterService.createWorkers();
    logger.log(`Primary ${process.pid} is running`);
  } else {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
      bufferLogs: true,
      abortOnError: false,
      cors: false,
      logger: isProd
        ? ['error', 'warn', 'log']
        : ['debug', 'error', 'warn', 'log'],
    });

    const configService = app.get(ConfigService);
    const clusterService = app.get(ClusterService);

    setupSecurity(app, isProd);
    setupParsers(app, isProd);
    setupGlobal(app);
    await setupSession(app, configService, isProd, logger);
    setupCors(app, configService);

    clusterService.setupWorkerProcess(app);

    const port = configService.get<number>('PORT', 3000);
    await app.listen(port, '0.0.0.0');
    logger.log(`🚀 Worker ${process.pid} running on http://localhost:${port}`);
  }
}

void bootstrap();
