import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { IDatabase } from '../interfaces/db.interface';

@Injectable()
export class PrismaService extends PrismaClient implements IDatabase {
  readonly name = 'Prisma';
  private connected = false;

  async connect(): Promise<void> {
    if (!this.connected) {
      try {
        await this.$connect();
        this.connected = true;
        console.log('[Prisma] Connected');
      } catch (err) {
        console.error('[Prisma] Connection error:', err);
        throw err;
      }
    }
  }

  async disconnect(): Promise<void> {
    if (this.connected) {
      await this.$disconnect();
      this.connected = false;
      console.log('[Prisma] Disconnected');
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  getConnection(): PrismaClient {
    return this;
  }
}
