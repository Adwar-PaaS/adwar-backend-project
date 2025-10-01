import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { ConfigService } from '@nestjs/config';
import { IDatabase } from '../interfaces/db.interface';

@Injectable()
export class RedisService
  implements IDatabase<RedisClientType>, OnModuleInit, OnModuleDestroy
{
  readonly name = 'Redis';
  private readonly client: RedisClientType;
  private readonly logger = new Logger(RedisService.name);

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('REDIS_HOST');
    const port = this.config.get<number>('REDIS_PORT');
    const username = this.config.get<string>('REDIS_USERNAME', 'default');
    const password = this.config.get<string>('REDIS_PASSWORD');

    if (!host || !port) {
      throw new Error('[Redis] Missing REDIS_HOST/REDIS_PORT configuration');
    }

    this.client = createClient({
      username,
      password: password || undefined,
      socket: {
        host,
        port,
        reconnectStrategy: (retries) => {
          this.logger.warn(`Reconnect attempt #${retries}`);
          return Math.min(retries * 100, 3000);
        },
      },
    });

    this._setupEvents();
  }

  private _setupEvents() {
    this.client.on('connect', () => this.logger.log('Connecting...'));
    this.client.on('ready', () => this.logger.log('Ready'));
    this.client.on('error', (err) => this.logger.error('Error', err));
    this.client.on('end', () => this.logger.warn('Connection closed'));
  }

  async onModuleInit() {
    await this.connect();
  }

  async connect() {
    if (!this.client.isOpen) {
      await this.client.connect();
    }
  }

  async disconnect() {
    if (this.client.isOpen) {
      await this.client.quit();
    }
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  async isHealthy(): Promise<boolean> {
    try {
      return (await this.client.ping()) === 'PONG';
    } catch (err) {
      this.logger.error('Health check failed', err);
      return false;
    }
  }

  async set(key: string, value: unknown, ttl?: number) {
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await this.client.set(key, serialized, { EX: ttl });
      } else {
        await this.client.set(key, serialized);
      }
    } catch (err) {
      this.logger.error(`Set failed [key=${key}]`, err);
    }
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const data = await this.client.get(key);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (err) {
      this.logger.error(`Get failed [key=${key}]`, err);
      return null;
    }
  }

  async del(key: string) {
    if (!key?.trim()) {
      this.logger.warn('Skipping delete: invalid key');
      return;
    }
    await this.client.del(key);
  }

  async delByPattern(pattern: string) {
    if (
      !pattern ||
      typeof pattern !== 'string' ||
      pattern.trim().length === 0
    ) {
      console.warn(
        '[Redis] Skipping delete by pattern: invalid pattern',
        pattern,
      );
      return;
    }

    const iter = this.client.scanIterator({ MATCH: pattern });
    for await (const key of iter) {
      if (key && key.length > 0) {
        await this.client.del(key);
      }
    }
  }

  getConnection(): RedisClientType {
    return this.client;
  }
}
