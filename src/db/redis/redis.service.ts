import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { ConfigService } from '@nestjs/config';
import { IDatabase } from '../interfaces/db.interface';

@Injectable()
export class RedisService
  implements IDatabase<RedisClientType>, OnModuleInit, OnModuleDestroy
{
  readonly name = 'Redis';
  private readonly client: RedisClientType;

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
          console.warn(`[Redis] Reconnect attempt #${retries}`);
          return Math.min(retries * 100, 3000);
        },
      },
    });

    this._setupEvents();
  }

  private _setupEvents() {
    this.client.on('connect', () => console.log('[Redis] Connecting...'));
    this.client.on('ready', () => console.log('[Redis] Ready'));
    this.client.on('error', (err) => console.error('[Redis] Error:', err));
    this.client.on('end', () => console.warn('[Redis] Connection closed'));
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
      console.error('[Redis] Health check failed:', err);
      return false;
    }
  }

  async set(key: string, value: unknown, ttl?: number) {
    const serialized = JSON.stringify(value);
    ttl
      ? await this.client.set(key, serialized, { EX: ttl })
      : await this.client.set(key, serialized);
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    const data = await this.client.get(key);
    if (!data) return null;

    try {
      return JSON.parse(data) as T;
    } catch {
      return data as unknown as T;
    }
  }

  async del(key?: string) {
    if (!key || typeof key !== 'string' || key.trim().length === 0) {
      console.warn('[Redis] Skipping delete: invalid key', key);
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
