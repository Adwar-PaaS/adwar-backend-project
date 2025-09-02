import { Injectable, Inject, Optional } from '@nestjs/common';
import { IDatabase } from '../interfaces/db.interface';
import { DatabaseType } from '../constants/db-type.enum';
import { DATABASE_TOKEN } from '../constants/db-token.constant';

@Injectable()
export class DatabaseFactoryService {
  constructor(
    @Inject(DATABASE_TOKEN.PRISMA) @Optional()
    private readonly prisma?: IDatabase,
    @Inject(DATABASE_TOKEN.REDIS) @Optional()
    private readonly redis?: IDatabase,
  ) {}

  create(type: DatabaseType): IDatabase {
    switch (type) {
      case DatabaseType.PRISMA:
        if (!this.prisma) throw new Error('[Factory] Prisma not available');
        return this.prisma;

      case DatabaseType.REDIS:
        if (!this.redis) throw new Error('[Factory] Redis not available');
        return this.redis;

      default:
        throw new Error(`[Factory] Unsupported database type: ${type}`);
    }
  }
}
