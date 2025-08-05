export abstract class IDatabase {
  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract isHealthy(): Promise<boolean>;
  abstract getConnection(): unknown;
}
