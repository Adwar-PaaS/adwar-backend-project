import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';
import { ConfigService } from '@nestjs/config';
import { IDatabase } from '../interfaces/db.interface';

@Injectable()
export class RedisService implements OnModuleDestroy, IDatabase {
  private client: RedisClientType;

  constructor(private config: ConfigService) {
    this.client = createClient({
      socket: {
        host: config.get('REDIS_HOST'),
        port: config.get<number>('REDIS_PORT'),
      },
      password: config.get('REDIS_PASSWORD'),
    });

    this._setupEvents();
  }

  private _setupEvents() {
    this.client.on('connect', () => console.log('[Redis] Connecting...'));
    this.client.on('ready', () => console.log('[Redis] Ready.'));
    this.client.on('error', (err) => console.error('[Redis] Error', err));
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
