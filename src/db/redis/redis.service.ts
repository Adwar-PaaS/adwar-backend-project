import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { ConfigService } from '@nestjs/config';
import { IDatabase } from '../interfaces/db.interface';

@Injectable()
export class RedisService
  implements IDatabase<RedisClientType>, OnModuleDestroy
{
  readonly name = 'Redis';
  private readonly client: RedisClientType;

  constructor(private readonly config: ConfigService) {
    const host = config.get<string>('REDIS_HOST');
    const port = config.get<number>('REDIS_PORT');
    const password = config.get<string>('REDIS_PASSWORD');

    if (!host || !port) {
      throw new Error('[Redis] Config error: host/port missing');
    }

    this.client = createClient({
      socket: { host, port },
      password,
    });

    this._setupEvents();
  }

  private _setupEvents() {
    this.client.on('connect', () => console.log('[Redis] Connecting...'));
    this.client.on('ready', () => console.log('[Redis] Ready'));
    this.client.on('error', (err) => console.error('[Redis] Error:', err));
  }

  async connect() {
    if (!this.client.isOpen) await this.client.connect();
  }

  async disconnect() {
    if (this.client.isOpen) await this.client.quit();
  }

  async isHealthy(): Promise<boolean> {
    try {
      return (await this.client.ping()) === 'PONG';
    } catch {
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
