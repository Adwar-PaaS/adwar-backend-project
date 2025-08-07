import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { IDatabase } from '../interfaces/db.interface';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements IDatabase, OnModuleInit, OnModuleDestroy
{
  readonly name = 'Prisma';

  async onModuleInit() {
    await this.connect();
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  async connect() {
    try {
      await this.$connect();
      console.log('[Prisma] Connected');
    } catch (err) {
      console.error('[Prisma] Connection error', err);
      throw err;
    }
  }

  async disconnect() {
    await this.$disconnect();
    console.log('[Prisma] Disconnected');
  }

  async isHealthy(): Promise<boolean> {
    try {
      await this.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }

  getConnection() {
    return this;
  }
}
