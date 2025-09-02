export abstract class IDatabase<T = unknown> {
  abstract readonly name: string;

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract isHealthy(): Promise<boolean>;
  abstract getConnection(): T;
}
