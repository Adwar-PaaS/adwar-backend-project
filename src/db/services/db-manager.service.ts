import { Injectable } from '@nestjs/common';
import { IDatabase } from '../interfaces/db.interface';
import { DatabaseType } from '../constants/db-type.enum';
import { DatabaseFactoryService } from './db-factory.service';

@Injectable()
export class DatabaseManagerService {
  private readonly databases = new Map<DatabaseType, IDatabase>();

  constructor(private readonly factory: DatabaseFactoryService) {}

  register(type: DatabaseType): void {
    if (!this.databases.has(type)) {
      const db = this.factory.create(type);
      this.databases.set(type, db);
    }
  }

  async connectAll(): Promise<void> {
    for (const [type, db] of this.databases) {
      try {
        await db.connect();
        const healthy = await db.isHealthy();
        if (!healthy) {
          throw new Error(`[DatabaseManager] ${type} is unhealthy`);
        }
        console.log(`[DatabaseManager] ${type} connected and healthy`);
      } catch (err) {
        console.error(`[DatabaseManager] Failed to connect ${type}:`, err);
      }
    }
  }

  async disconnectAll(): Promise<void> {
    for (const [type, db] of this.databases) {
      try {
        await db.disconnect();
        console.log(`[DatabaseManager] ${type} disconnected`);
      } catch (err) {
        console.error(`[DatabaseManager] Failed to disconnect ${type}:`, err);
      }
    }
  }

  get(type: DatabaseType): IDatabase | undefined {
    return this.databases.get(type);
  }

  getAll(): IDatabase[] {
    return [...this.databases.values()];
  }
}
