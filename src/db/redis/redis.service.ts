import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { ConfigService } from '@nestjs/config';
import { IDatabase } from '../interfaces/db.interface';

@Injectable()
export class RedisService
  implements IDatabase<RedisClientType>, OnModuleInit, OnModuleDestroy
{
  readonly name = 'Redis';
  private client: RedisClientType;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('REDIS_HOST');
    const port = this.config.get<number>('REDIS_PORT');
    const username = this.config.get<string>('REDIS_USERNAME', 'default');
    const password = this.config.get<string>('REDIS_PASSWORD');

    if (!host || !port) {
      throw new Error('[Redis] Config error: host/port missing');
    }

    this.client = createClient({
      username,
      password: password || undefined,
      socket: {
        host,
        port,
        reconnectStrategy: (retries) => {
          console.warn(`[Redis] Reconnecting attempt #${retries}`);
          return Math.min(retries * 50, 2000);
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
    if (!this.client.isOpen) {
      await this.client.connect();
    }
  }

  async connect() {
    if (!this.client.isOpen) {
      await this.client.connect();
    }
  }

  async set(key: string, value: any, ttl?: number) {
    const val = JSON.stringify(value);
    if (ttl) {
      await this.client.set(key, val, { EX: ttl });
    } else {
      await this.client.set(key, val);
    }
  }

  async get<T = any>(key: string): Promise<T | null> {
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async del(key: string) {
    await this.client.del(key);
  }

  async disconnect() {
    if (this.client.isOpen) {
      await this.client.quit();
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      return (await this.client.ping()) === 'PONG';
    } catch (e) {
      console.error('[Redis] Health check failed:', e);
      return false;
    }
  }

  getConnection() {
    return this.client;
  }

  async onModuleDestroy() {
    await this.disconnect();
  }
}
