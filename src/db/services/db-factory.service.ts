import { Injectable, Inject } from '@nestjs/common';
import { IDatabase } from '../interfaces/db.interface';
import { DatabaseType } from '../constants/db-type.enum';
import { DATABASE_TOKEN } from '../constants/db-token.constant';

@Injectable()
export class DatabaseFactoryService {
  private readonly instanceMap: Partial<Record<DatabaseType, IDatabase>>;

  constructor(
    @Inject(DATABASE_TOKEN.PRISMA) private readonly prisma: IDatabase,
    // @Inject(DATABASE_TOKEN.REDIS) private readonly redis: IDatabase,
  ) {
    this.instanceMap = {
      [DatabaseType.PRISMA]: this.prisma,
      // [DatabaseType.REDIS]: this.redis,
    };
  }

  create(type: DatabaseType): IDatabase {
    const db = this.instanceMap[type];
    if (!db) throw new Error(`Database type "${type}" is not supported`);
    return db;
  }
}
