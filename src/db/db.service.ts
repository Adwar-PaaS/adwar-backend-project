import { Injectable } from '@nestjs/common';
import { IDatabase } from './interfaces/db.interface';

@Injectable()
export class DatabaseManagerService {
  private databases: IDatabase[] = [];

  register(database: IDatabase) {
    if (!this.databases.includes(database)) this.databases.push(database);
  }

  async connectAll() {
    for (const db of this.databases) await db.connect();
  }

  async disconnectAll() {
    for (const db of this.databases) await db.disconnect();
  }

  getAll() {
    return this.databases;
  }
}
