import { Injectable, Inject, Optional } from '@nestjs/common';
import { IDatabase } from '../interfaces/db.interface';
import { DatabaseType } from '../constants/db-type.enum';
import { DATABASE_TOKEN } from '../constants/db-token.constant';

@Injectable()
export class DatabaseFactoryService {
  private readonly registry = new Map<DatabaseType, IDatabase>();

  constructor(
    @Inject(DATABASE_TOKEN.PRISMA) @Optional() prisma?: IDatabase,
    @Inject(DATABASE_TOKEN.REDIS) @Optional() redis?: IDatabase,
  ) {
    if (prisma) this.registry.set(DatabaseType.PRISMA, prisma);
    if (redis) this.registry.set(DatabaseType.REDIS, redis);
  }

  create(type: DatabaseType): IDatabase {
    const db = this.registry.get(type);
    if (!db) throw new Error(`[Factory] ${type} not available`);
    return db;
  }

  getAll(): Map<DatabaseType, IDatabase> {
    return this.registry;
  }
}
