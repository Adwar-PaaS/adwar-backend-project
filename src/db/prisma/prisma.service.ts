import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { IDatabase } from '../interfaces/db.interface';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements IDatabase<PrismaClient>
{
  readonly name = 'Prisma';
  private connected = false;

  async connect(): Promise<void> {
    if (!this.connected) {
      try {
        await this.$connect();
        this.connected = true;
        console.log('[Prisma] Connected');
      } catch (err) {
        console.error('[Prisma] Connection failed:', err);
        throw new Error('Failed to connect to Prisma');
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
    } catch (err) {
      console.error('[Prisma] Health check failed:', err);
      return false;
    }
  }

  getConnection(): PrismaClient {
    return this;
  }
}
