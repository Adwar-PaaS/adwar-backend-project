import { Injectable, OnApplicationShutdown, Logger } from '@nestjs/common';
import { IDatabase } from '../interfaces/db.interface';
import { DatabaseType } from '../constants/db-type.enum';
import { DatabaseFactoryService } from './db-factory.service';

@Injectable()
export class DatabaseManagerService implements OnApplicationShutdown {
  private readonly logger = new Logger(DatabaseManagerService.name);
  private readonly databases = new Map<DatabaseType, IDatabase>();

  constructor(private readonly factory: DatabaseFactoryService) {
    this.autoRegister();
  }

  private autoRegister(): void {
    for (const type of Object.values(DatabaseType)) {
      try {
        const db = this.factory.create(type);
        this.databases.set(type, db);
        this.log(`Registered ${db.name} (${type})`);
      } catch (err) {
        this.warn(`Skipped ${type}: ${err.message}`);
      }
    }
  }

  private async runOnAll(
    action: 'connect' | 'disconnect',
    validateHealth = false,
  ): Promise<void> {
    await Promise.all(
      Array.from(this.databases.entries()).map(async ([type, db]) => {
        try {
          await db[action]();

          if (validateHealth && !(await db.isHealthy())) {
            throw new Error(`${db.name} is unhealthy`);
          }

          this.log(
            `${db.name} (${type}) ${action}${validateHealth ? 'ed & healthy' : 'ed'}`,
          );
        } catch (err) {
          this.error(`Failed to ${action} ${type}`, err);
        }
      }),
    );
  }

  async connectAll(): Promise<void> {
    await this.runOnAll('connect', true);
  }

  async disconnectAll(): Promise<void> {
    await this.runOnAll('disconnect');
  }

  get(type: DatabaseType): IDatabase | undefined {
    return this.databases.get(type);
  }

  getAll(): IDatabase[] {
    return [...this.databases.values()];
  }

  async onApplicationShutdown(signal?: string): Promise<void> {
    this.log(`Shutdown signal received: ${signal}`);
    await this.disconnectAll();
  }

  private log(msg: string) {
    this.logger.log(msg);
  }
  private warn(msg: string) {
    this.logger.warn(msg);
  }
  private error(msg: string, err: unknown) {
    this.logger.error(`${msg}: ${err instanceof Error ? err.message : err}`);
  }
}
