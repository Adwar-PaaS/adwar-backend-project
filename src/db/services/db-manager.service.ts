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
      this.databases.set(type, this.factory.create(type));
    }
  }

  async connectAll(): Promise<void> {
    for (const [type, db] of this.databases) {
      try {
        await db.connect();
        if (!(await db.isHealthy())) {
          throw new Error(`${db.name} is unhealthy`);
        }
        console.log(
          `[DatabaseManager] ${db.name} (${type}) connected & healthy`,
        );
      } catch (err) {
        console.error(`[DatabaseManager] Failed to connect ${type}:`, err);
      }
    }
  }

  async disconnectAll(): Promise<void> {
    for (const [type, db] of this.databases) {
      try {
        await db.disconnect();
        console.log(`[DatabaseManager] ${db.name} (${type}) disconnected`);
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
