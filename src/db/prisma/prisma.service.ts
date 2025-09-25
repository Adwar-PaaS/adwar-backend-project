import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { IDatabase } from '../interfaces/db.interface';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements IDatabase<PrismaClient>, OnModuleInit, OnModuleDestroy
{
  readonly name = 'Prisma';
  private readonly logger = new Logger(PrismaService.name);
  private connected = false;

  constructor() {
    super({
      log:
        process.env.NODE_ENV === 'production'
          ? ['error', 'warn']
          : ['query', 'info', 'warn', 'error'],
    });
  }

  async onModuleInit() {
    await this.connect();

    if (
      process.env.DEBUG_QUERIES === 'true' &&
      process.env.NODE_ENV !== 'production'
    ) {
      this.$on(
        'query' as never,
        (e: { query: string; params: string; duration: number }) => {
          this.logger.debug(
            `[Prisma Query] ${e.query}\nParams: ${e.params}\nDuration: ${e.duration}ms`,
          );
        },
      );
    }
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  async connect(): Promise<void> {
    if (!this.connected) {
      try {
        await this.$connect();
        this.connected = true;
        this.logger.log('[Prisma] Connected');
      } catch (err) {
        this.logger.error('[Prisma] Connection failed', err.stack || err);
        throw err;
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.$disconnect();
      this.connected = false;
      this.logger.log('[Prisma] Disconnected');
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRawUnsafe(`SELECT 1`);
      return true;
    } catch (err) {
      this.logger.error('[Prisma] Health check failed', err.stack || err);
      return false;
    }
  }

  getConnection(): PrismaClient {
    return this;
  }
}
