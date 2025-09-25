// import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
// import cluster, { Worker } from 'node:cluster';
// import * as os from 'os';
// import { NestExpressApplication } from '@nestjs/platform-express';
// import { EventEmitter } from 'node:events';

// interface WorkerStats {
//   readonly pid: number;
//   readonly memory: NodeJS.MemoryUsage;
//   readonly uptime: number;
//   readonly cpuUsage: NodeJS.CpuUsage;
//   readonly requestCount: number;
//   readonly errorCount: number;
//   readonly lastHeartbeat: number;
//   readonly status: 'healthy' | 'unhealthy' | 'restarting';
//   readonly memoryUsageMB: number;
// }

// interface WorkerMessage {
//   readonly type:
//     | 'health-check'
//     | 'health-response'
//     | 'worker-stats'
//     | 'worker-error'
//     | 'restart-request'
//     | 'request-count'
//     | 'get-stats'
//     | 'stats-response'
//     | 'shutdown'
//     | 'graceful-restart';
//   readonly data?: unknown;
//   readonly error?: {
//     message: string;
//     stack?: string;
//     type: string;
//     timestamp: number;
//   };
//   readonly id?: string;
//   readonly timestamp: number;
// }

// interface ClusterStats {
//   readonly masterPid: number;
//   readonly workers: Record<number, WorkerStats>;
//   readonly totalRequests: number;
//   readonly totalErrors: number;
//   readonly uptime: number;
//   readonly memoryUsage: NodeJS.MemoryUsage;
//   readonly clusterHealth: 'healthy' | 'degraded' | 'unhealthy';
// }

// interface ClusterConfig {
//   readonly maxWorkers: number;
//   readonly minWorkers: number;
//   readonly healthCheckInterval: number;
//   readonly healthCheckTimeout: number;
//   readonly restartDelay: number;
//   readonly shutdownTimeout: number;
//   readonly maxRestarts: number;
//   readonly restartWindow: number;
//   readonly memoryThresholdMB: number;
//   readonly maxMemoryThresholdMB: number;
// }

// @Injectable()
// export class ClusterService extends EventEmitter implements OnModuleDestroy {
//   private readonly logger = new Logger(ClusterService.name);
//   private readonly numCPUs = os.cpus().length;
//   private readonly workers = new Map<number, Worker>();
//   private readonly workerStats = new Map<number, WorkerStats>();
//   private readonly workerPendingChecks = new Map<
//     number,
//     Map<string, NodeJS.Timeout>
//   >();
//   private readonly clusterRestarts: number[] = [];
//   private readonly config: ClusterConfig;

//   private shutdownInProgress = false;
//   private readonly pendingMessages = new Map<
//     string,
//     {
//       resolve: (data: unknown) => void;
//       reject: (err: Error) => void;
//       timeout: NodeJS.Timeout;
//     }
//   >();

//   private requestCount = 0;
//   private errorCount = 0;
//   private readonly startTime = Date.now();

//   // Monitoring intervals
//   private healthMonitorInterval?: NodeJS.Timeout;
//   private statsCollectionInterval?: NodeJS.Timeout;
//   private workerStatsInterval?: NodeJS.Timeout;
//   private memoryMonitorInterval?: NodeJS.Timeout;

//   constructor() {
//     super();
//     this.config = this.loadConfig();
//     this.setupEventHandlers();
//   }

//   onModuleDestroy() {
//     this.cleanup();
//   }

//   private loadConfig(): ClusterConfig {
//     return {
//       maxWorkers: this.parseEnvInt('MAX_WORKERS', 0),
//       minWorkers: this.parseEnvInt('MIN_WORKERS', 1),
//       healthCheckInterval: this.parseEnvInt('HEALTH_CHECK_INTERVAL', 30000),
//       healthCheckTimeout: this.parseEnvInt('HEALTH_CHECK_TIMEOUT', 10000),
//       restartDelay: this.parseEnvInt('RESTART_DELAY', 2000),
//       shutdownTimeout: this.parseEnvInt('SHUTDOWN_TIMEOUT', 15000),
//       maxRestarts: this.parseEnvInt('MAX_RESTARTS', 3),
//       restartWindow: this.parseEnvInt('RESTART_WINDOW', 300000),
//       memoryThresholdMB: this.parseEnvInt('MEMORY_THRESHOLD_MB', 400),
//       maxMemoryThresholdMB: this.parseEnvInt('MAX_MEMORY_THRESHOLD_MB', 700),
//     };
//   }

//   private parseEnvInt(key: string, defaultValue: number): number {
//     const value = process.env[key];
//     if (!value) return defaultValue;
//     const parsed = parseInt(value, 10);
//     return isNaN(parsed) ? defaultValue : Math.max(0, parsed);
//   }

//   private setupEventHandlers(): void {
//     this.on('worker-created', (workerId: number) => {
//       this.logger.log(`Worker ${workerId} created successfully`);
//     });

//     this.on(
//       'worker-died',
//       (workerId: number, code: number, signal: string | null) => {
//         this.logger.warn(
//           `Worker ${workerId} died (code=${code}, signal=${signal ?? 'unknown'})`,
//         );
//       },
//     );

//     this.on('worker-unhealthy', (workerId: number, reason: string) => {
//       this.logger.warn(`Worker ${workerId} marked as unhealthy: ${reason}`);
//     });

//     this.on('memory-warning', (workerId: number, memoryMB: number) => {
//       this.logger.warn(`Worker ${workerId} high memory usage: ${memoryMB}MB`);
//     });
//   }

//   isPrimary(): boolean {
//     return cluster.isPrimary;
//   }

//   createWorkers(): void {
//     if (!this.isPrimary()) {
//       throw new Error(
//         'createWorkers() can only be called from primary process',
//       );
//     }

//     const workerCount = this.getOptimalWorkerCount();
//     this.logger.log(
//       `Primary ${process.pid} starting ${workerCount} workers on ${this.numCPUs} cores`,
//     );

//     // Stagger worker creation to avoid connection storms
//     for (let i = 0; i < workerCount; i++) {
//       setTimeout(() => {
//         this.createWorker();
//       }, i * 1000); // 1 second delay between worker starts
//     }

//     this.setupPrimaryEventHandlers();
//     this.setupGracefulShutdown();
//     this.startHealthMonitoring();
//     this.startStatsCollection();
//     this.startMemoryMonitoring();

//     this.logger.log('Cluster service initialized successfully');
//   }

//   private getOptimalWorkerCount(): number {
//     const { maxWorkers, minWorkers } = this.config;

//     const maxLimit =
//       maxWorkers > 0 ? Math.min(maxWorkers, this.numCPUs) : this.numCPUs;

//     let desired: number;

//     if (maxWorkers === 0) {
//       const totalMemoryMB = os.totalmem() / (1024 * 1024);
//       const memoryBased = Math.floor(totalMemoryMB / 500);
//       const envCap = process.env.NODE_ENV === 'production' ? 8 : 4;
//       desired = Math.min(memoryBased, envCap, maxLimit);
//     } else {
//       desired = maxLimit;
//     }

//     const finalCount = Math.min(Math.max(minWorkers, desired), maxLimit);

//     if (finalCount < minWorkers) {
//       this.logger.warn(
//         `Worker count capped at ${finalCount} (min is ${minWorkers}) due to system limits`,
//       );
//     }

//     return finalCount;
//   }

//   private createWorker(): Worker | null {
//     if (this.shutdownInProgress) {
//       return null;
//     }

//     try {
//       const worker = cluster.fork();

//       if (!worker.id) {
//         this.logger.error('Failed to create worker - invalid worker object');
//         return null;
//       }

//       this.workers.set(worker.id, worker);
//       this.workerPendingChecks.set(worker.id, new Map());

//       worker.on('message', (message: unknown) => {
//         if (this.isValidWorkerMessage(message)) {
//           this.handleWorkerMessage(worker, message);
//         }
//       });

//       worker.on('error', (error) => {
//         this.logger.error(`Worker ${worker.id} error:`, error);
//       });

//       // Delay health checks to allow worker to initialize
//       setTimeout(() => {
//         this.setupWorkerHealthCheck(worker);
//       }, 10000);

//       this.emit('worker-created', worker.id);

//       this.logger.log(
//         `Worker ${worker.id} (PID: ${worker.process.pid}) created`,
//       );
//       return worker;
//     } catch (error) {
//       this.logger.error('Failed to create worker:', error);
//       return null;
//     }
//   }

//   private isValidWorkerMessage(message: unknown): message is WorkerMessage {
//     if (!message || typeof message !== 'object') return false;

//     const msg = message as Record<string, unknown>;
//     return (
//       typeof msg.type === 'string' &&
//       typeof msg.timestamp === 'number' &&
//       msg.timestamp > 0
//     );
//   }

//   private setupPrimaryEventHandlers(): void {
//     cluster.on('exit', this.handleWorkerExit.bind(this));
//     cluster.on('online', this.handleWorkerOnline.bind(this));
//     cluster.on('listening', this.handleWorkerListening.bind(this));
//   }

//   private handleWorkerExit(
//     worker: Worker,
//     code: number,
//     signal: string | null,
//   ): void {
//     this.emit('worker-died', worker.id, code, signal);

//     this.cleanupWorker(worker.id);

//     if (!worker.exitedAfterDisconnect && !this.shutdownInProgress) {
//       if (this.shouldAutoRestart()) {
//         this.logger.log(
//           `Restarting worker ${worker.id} in ${this.config.restartDelay}ms...`,
//         );
//         setTimeout(() => this.createWorker(), this.config.restartDelay);
//       } else {
//         this.logger.error(
//           `Worker ${worker.id} exceeded restart limit, not restarting`,
//         );
//       }
//     }
//   }

//   private shouldAutoRestart(): boolean {
//     const now = Date.now();
//     const recentRestarts = this.clusterRestarts.filter(
//       (time) => now - time < this.config.restartWindow,
//     );

//     if (recentRestarts.length >= this.config.maxRestarts) {
//       this.logger.error(
//         `Exceeded cluster restart limit (${this.config.maxRestarts} in ${this.config.restartWindow / 60000} min)`,
//       );
//       return false;
//     }

//     this.clusterRestarts.push(now);
//     return true;
//   }

//   private cleanupWorker(workerId: number): void {
//     this.workers.delete(workerId);

//     const pendingChecks = this.workerPendingChecks.get(workerId);
//     if (pendingChecks) {
//       for (const timeout of pendingChecks.values()) {
//         clearTimeout(timeout);
//       }
//       this.workerPendingChecks.delete(workerId);
//     }

//     this.workerStats.delete(workerId);
//   }

//   private handleWorkerOnline(worker: Worker): void {
//     this.logger.log(
//       `Worker ${worker.id} (PID: ${worker.process.pid}) is online`,
//     );
//   }

//   private handleWorkerListening(worker: Worker, address: any): void {
//     this.logger.log(
//       `Worker ${worker.id} (PID: ${worker.process.pid}) listening on ${address.address}:${address.port}`,
//     );
//   }

//   private setupWorkerHealthCheck(worker: Worker): void {
//     if (!worker.id || worker.isDead() || this.shutdownInProgress) {
//       return;
//     }

//     const checkHealth = () => {
//       if (worker.isDead() || this.shutdownInProgress) {
//         return;
//       }

//       const checkId = this.generateMessageId();
//       try {
//         worker.send({
//           type: 'health-check',
//           id: checkId,
//           timestamp: Date.now(),
//         });
//       } catch (error) {
//         this.logger.error(
//           `Failed to send health check to worker ${worker.id}:`,
//           error,
//         );
//         return;
//       }

//       const pending = this.workerPendingChecks.get(worker.id);
//       if (pending) {
//         const healthTimeout = setTimeout(() => {
//           this.emit('worker-unhealthy', worker.id, 'Health check timeout');
//           this.restartWorker(worker, 'health check timeout');
//           pending.delete(checkId);
//         }, this.config.healthCheckTimeout);
//         pending.set(checkId, healthTimeout);
//       }
//     };

//     // Regular health checks
//     const interval = setInterval(() => {
//       if (!worker.isDead() && !this.shutdownInProgress) {
//         checkHealth();
//       } else {
//         clearInterval(interval);
//       }
//     }, this.config.healthCheckInterval);

//     worker.on('disconnect', () => clearInterval(interval));
//     worker.on('exit', () => clearInterval(interval));
//   }

//   private handleWorkerMessage(worker: Worker, msg: WorkerMessage): void {
//     try {
//       switch (msg.type) {
//         case 'health-response':
//           this.handleHealthResponse(worker, msg);
//           break;

//         case 'worker-stats':
//           this.updateWorkerStats(worker.id, msg.data as Partial<WorkerStats>);
//           break;

//         case 'worker-error':
//           this.handleWorkerError(worker, msg.error!);
//           break;

//         case 'restart-request':
//           this.logger.log(`Worker ${worker.id} requested restart`);
//           this.restartWorker(worker, 'worker request');
//           break;

//         case 'get-stats':
//           this.handleStatsRequest(worker, msg.id!);
//           break;

//         case 'stats-response':
//           this.handleStatsResponse(msg);
//           break;

//         default:
//           this.logger.debug(
//             `Unknown message type '${msg.type}' from worker ${worker.id}`,
//           );
//       }
//     } catch (error) {
//       this.logger.error(
//         `Error handling message from worker ${worker.id}:`,
//         error,
//       );
//     }
//   }

//   private handleHealthResponse(worker: Worker, msg: WorkerMessage): void {
//     if (msg.id) {
//       const pending = this.workerPendingChecks.get(worker.id);
//       const timeout = pending?.get(msg.id);
//       if (pending && timeout) {
//         clearTimeout(timeout);
//         pending.delete(msg.id);

//         const stats = this.workerStats.get(worker.id);
//         if (stats) {
//           this.workerStats.set(worker.id, {
//             ...stats,
//             lastHeartbeat: Date.now(),
//             status: 'healthy',
//           });
//         }
//       }
//     }
//   }

//   private updateWorkerStats(
//     workerId: number,
//     stats: Partial<WorkerStats>,
//   ): void {
//     const existingStats =
//       this.workerStats.get(workerId) || this.createDefaultWorkerStats();

//     const enhancedStats: WorkerStats = {
//       ...existingStats,
//       ...stats,
//       lastHeartbeat: Date.now(),
//       memoryUsageMB: Math.round((stats.memory?.heapUsed || 0) / 1024 / 1024),
//       status: this.evaluateWorkerHealth({ ...existingStats, ...stats }),
//     };

//     this.workerStats.set(workerId, enhancedStats);

//     // Check for memory issues
//     if (enhancedStats.memoryUsageMB > this.config.memoryThresholdMB) {
//       this.emit('memory-warning', workerId, enhancedStats.memoryUsageMB);

//       if (enhancedStats.memoryUsageMB > this.config.maxMemoryThresholdMB) {
//         this.emit('worker-unhealthy', workerId, 'Critical memory usage');
//         const worker = this.workers.get(workerId);
//         if (worker) {
//           this.restartWorker(worker, 'critical memory usage');
//         }
//       }
//     }
//   }

//   private createDefaultWorkerStats(): WorkerStats {
//     return {
//       pid: 0,
//       memory: {
//         heapUsed: 0,
//         heapTotal: 0,
//         external: 0,
//         rss: 0,
//         arrayBuffers: 0,
//       },
//       uptime: 0,
//       cpuUsage: { user: 0, system: 0 },
//       requestCount: 0,
//       errorCount: 0,
//       lastHeartbeat: Date.now(),
//       status: 'healthy',
//       memoryUsageMB: 0,
//     };
//   }

//   private evaluateWorkerHealth(
//     stats: WorkerStats,
//   ): 'healthy' | 'unhealthy' | 'restarting' {
//     if (stats.memoryUsageMB > this.config.maxMemoryThresholdMB) {
//       return 'unhealthy';
//     }

//     if (stats.memoryUsageMB > this.config.memoryThresholdMB) {
//       return 'unhealthy';
//     }

//     if (
//       stats.errorCount > stats.requestCount * 0.1 &&
//       stats.requestCount > 100
//     ) {
//       return 'unhealthy';
//     }

//     return 'healthy';
//   }

//   private handleWorkerError(
//     worker: Worker,
//     error: NonNullable<WorkerMessage['error']>,
//   ): void {
//     this.logger.error(`Worker ${worker.id} error:`, error);

//     if (['uncaughtException', 'unhandledRejection'].includes(error.type)) {
//       this.logger.error(`Fatal error in worker ${worker.id}, restarting...`);
//       this.restartWorker(worker, 'fatal error');
//     }
//   }

//   private handleStatsRequest(worker: Worker, messageId: string): void {
//     const stats = this.getClusterStats();
//     try {
//       worker.send({
//         type: 'stats-response',
//         data: stats,
//         id: messageId,
//         timestamp: Date.now(),
//       });
//     } catch (error) {
//       this.logger.error(`Failed to send stats to worker ${worker.id}:`, error);
//     }
//   }

//   private handleStatsResponse(msg: WorkerMessage): void {
//     const pending = this.pendingMessages.get(msg.id!);
//     if (pending) {
//       pending.resolve(msg.data);
//       clearTimeout(pending.timeout);
//       this.pendingMessages.delete(msg.id!);
//     }
//   }

//   private restartWorker(worker: Worker, reason: string): void {
//     if (!worker.id || this.shutdownInProgress || worker.isDead()) {
//       return;
//     }

//     this.logger.log(`Restarting worker ${worker.id} due to: ${reason}`);

//     // Update worker status
//     const stats = this.workerStats.get(worker.id);
//     if (stats) {
//       this.workerStats.set(worker.id, { ...stats, status: 'restarting' });
//     }

//     // Create replacement first
//     const newWorker = this.createWorker();

//     if (newWorker) {
//       // Gracefully shutdown old worker
//       setTimeout(() => {
//         if (!worker.isDead()) {
//           worker.kill('SIGTERM');

//           // Force kill if not responsive
//           setTimeout(() => {
//             if (!worker.isDead()) {
//               worker.kill('SIGKILL');
//             }
//           }, this.config.shutdownTimeout);
//         }
//       }, 2000);
//     }
//   }

//   private startHealthMonitoring(): void {
//     this.healthMonitorInterval = setInterval(() => {
//       if (this.shutdownInProgress) return;

//       const aliveWorkers = Array.from(this.workers.values()).filter(
//         (w) => !w.isDead(),
//       );
//       const requiredWorkers = this.getOptimalWorkerCount();

//       if (aliveWorkers.length < requiredWorkers) {
//         const needed = requiredWorkers - aliveWorkers.length;
//         this.logger.warn(
//           `Only ${aliveWorkers.length}/${requiredWorkers} workers alive. Creating ${needed} replacements...`,
//         );

//         for (let i = 0; i < needed; i++) {
//           setTimeout(() => this.createWorker(), i * 2000);
//         }
//       }
//     }, 60000);
//   }

//   private startMemoryMonitoring(): void {
//     this.memoryMonitorInterval = setInterval(() => {
//       const memoryUsage = process.memoryUsage();
//       const usedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);

//       if (usedMB > this.config.memoryThresholdMB) {
//         this.logger.warn(`Primary process high memory usage: ${usedMB}MB`);
//       }
//     }, 30000);
//   }

//   private startStatsCollection(): void {
//     this.statsCollectionInterval = setInterval(() => {
//       if (this.shutdownInProgress) return;

//       const stats = this.getClusterHealthSummary();
//       this.logger.log(
//         `Cluster: ${stats.totalWorkers} workers (${stats.healthyWorkers} healthy), ` +
//           `${stats.totalRequests} requests, ${stats.avgMemoryMB}MB avg memory`,
//       );
//     }, 300000);
//   }

//   private getClusterHealthSummary() {
//     const workers = Array.from(this.workerStats.values());
//     const totalWorkers = workers.length;
//     const healthyWorkers = workers.filter((w) => w.status === 'healthy').length;
//     const totalRequests = workers.reduce((sum, w) => sum + w.requestCount, 0);
//     const avgMemoryMB =
//       workers.length > 0
//         ? Math.round(
//             workers.reduce((sum, w) => sum + w.memoryUsageMB, 0) /
//               workers.length,
//           )
//         : 0;

//     return { totalWorkers, healthyWorkers, totalRequests, avgMemoryMB };
//   }

//   private getClusterStats(): ClusterStats {
//     const workers = Object.fromEntries(this.workerStats.entries());
//     const totalRequests = Array.from(this.workerStats.values()).reduce(
//       (sum, stats) => sum + stats.requestCount,
//       0,
//     );

//     const totalErrors = Array.from(this.workerStats.values()).reduce(
//       (sum, stats) => sum + stats.errorCount,
//       0,
//     );

//     const healthyWorkers = Object.values(workers).filter(
//       (w) => w.status === 'healthy',
//     ).length;
//     const totalWorkers = Object.keys(workers).length;

//     let clusterHealth: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
//     if (healthyWorkers < totalWorkers * 0.5) {
//       clusterHealth = 'unhealthy';
//     } else if (healthyWorkers < totalWorkers) {
//       clusterHealth = 'degraded';
//     }

//     return {
//       masterPid: process.pid,
//       workers,
//       totalRequests,
//       totalErrors,
//       uptime: Date.now() - this.startTime,
//       memoryUsage: process.memoryUsage(),
//       clusterHealth,
//     };
//   }

//   async getStats(): Promise<ClusterStats> {
//     if (this.isPrimary()) {
//       return this.getClusterStats();
//     }

//     return this.requestStatsFromPrimary();
//   }

//   private async requestStatsFromPrimary(): Promise<ClusterStats> {
//     const id = this.generateMessageId();

//     return new Promise((resolve, reject) => {
//       const timeout = setTimeout(() => {
//         reject(new Error('Timeout waiting for cluster stats'));
//         this.pendingMessages.delete(id);
//       }, 5000);

//       this.pendingMessages.set(id, {
//         resolve: (data) => {
//           clearTimeout(timeout);
//           resolve(data as ClusterStats);
//         },
//         reject,
//         timeout,
//       });

//       try {
//         process.send?.({
//           type: 'get-stats',
//           id,
//           timestamp: Date.now(),
//         });
//       } catch (error) {
//         clearTimeout(timeout);
//         this.pendingMessages.delete(id);
//         reject(error);
//       }
//     });
//   }

//   private generateMessageId(): string {
//     return `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
//   }

//   private setupGracefulShutdown(): void {
//     const shutdown = async (signal: string) => {
//       if (this.shutdownInProgress) return;
//       this.shutdownInProgress = true;

//       this.logger.log(
//         `Primary received ${signal}. Starting graceful shutdown...`,
//       );

//       this.cleanup();

//       // Shutdown workers gracefully
//       const shutdownPromises = Array.from(this.workers.values()).map((w) =>
//         this.shutdownWorker(w),
//       );

//       try {
//         await Promise.allSettled(shutdownPromises);
//         this.logger.log('All workers shut down gracefully');
//       } catch (error) {
//         this.logger.error('Error during worker shutdown:', error);
//       }

//       process.exit(0);
//     };

//     process.on('SIGTERM', () => shutdown('SIGTERM'));
//     process.on('SIGINT', () => shutdown('SIGINT'));

//     // Handle uncaught exceptions in primary
//     process.on('uncaughtException', (error) => {
//       this.logger.error('Uncaught exception in primary process:', error);
//       shutdown('uncaughtException');
//     });

//     process.on('unhandledRejection', (reason, promise) => {
//       this.logger.error('Unhandled rejection in primary process:', {
//         reason,
//         promise,
//       });
//       shutdown('unhandledRejection');
//     });
//   }

//   private cleanup(): void {
//     // Clear intervals
//     const intervals = [
//       this.healthMonitorInterval,
//       this.statsCollectionInterval,
//       this.workerStatsInterval,
//       this.memoryMonitorInterval,
//     ];

//     intervals.forEach((interval) => {
//       if (interval) {
//         clearInterval(interval);
//       }
//     });

//     // Clean up pending messages
//     for (const [id, pending] of this.pendingMessages.entries()) {
//       pending.reject(new Error('Shutdown in progress'));
//       clearTimeout(pending.timeout);
//       this.pendingMessages.delete(id);
//     }

//     // Clean up pending health checks
//     for (const [
//       workerId,
//       pendingChecks,
//     ] of this.workerPendingChecks.entries()) {
//       for (const timeout of pendingChecks.values()) {
//         clearTimeout(timeout);
//       }
//       pendingChecks.clear();
//     }
//   }

//   private async shutdownWorker(worker: Worker): Promise<void> {
//     return new Promise((resolve) => {
//       if (worker.isDead()) {
//         resolve();
//         return;
//       }

//       const timeout = setTimeout(() => {
//         this.logger.warn(
//           `Force killing worker ${worker.id} (PID: ${worker.process.pid})`,
//         );
//         worker.kill('SIGKILL');
//         resolve();
//       }, this.config.shutdownTimeout);

//       const onDisconnect = () => {
//         clearTimeout(timeout);
//         resolve();
//       };

//       const onExit = () => {
//         clearTimeout(timeout);
//         resolve();
//       };

//       worker.once('disconnect', onDisconnect);
//       worker.once('exit', onExit);

//       // Send graceful shutdown signal
//       try {
//         worker.send({ type: 'shutdown', timestamp: Date.now() });
//         worker.disconnect();
//       } catch (error) {
//         this.logger.error(`Error shutting down worker ${worker.id}:`, error);
//         worker.kill('SIGKILL');
//         resolve();
//       }
//     });
//   }

//   setupWorkerProcess(app: NestExpressApplication): void {
//     if (this.isPrimary()) {
//       this.logger.warn('setupWorkerProcess called from primary process');
//       return;
//     }

//     this.requestCount = 0;
//     this.errorCount = 0;

//     process.on('message', (msg: unknown) => {
//       if (this.isValidWorkerMessage(msg)) {
//         this.handlePrimaryMessage(msg);
//       }
//     });

//     this.startWorkerStatsReporting();
//     this.setupRequestCounter(app);
//     this.setupWorkerErrorHandling();
//     this.setupWorkerMemoryMonitoring();

//     this.logger.log(`Worker ${process.pid} initialized successfully`);
//   }

//   private handlePrimaryMessage(msg: WorkerMessage): void {
//     switch (msg.type) {
//       case 'health-check':
//         process.send?.({
//           type: 'health-response',
//           id: msg.id,
//           timestamp: Date.now(),
//         });
//         break;

//       case 'shutdown':
//         this.logger.log('Received shutdown signal from primary');
//         this.initiateWorkerShutdown();
//         break;

//       case 'stats-response':
//         const pending = this.pendingMessages.get(msg.id!);
//         if (pending) {
//           pending.resolve(msg.data);
//           this.pendingMessages.delete(msg.id!);
//         }
//         break;

//       default:
//         this.logger.debug(`Unknown message type '${msg.type}' from primary`);
//     }
//   }

//   private initiateWorkerShutdown(): void {
//     this.logger.log('Initiating graceful worker shutdown...');

//     this.cleanup();

//     // Give time for current requests to complete
//     setTimeout(() => {
//       process.exit(0);
//     }, 5000);
//   }

//   private setupWorkerErrorHandling(): void {
//     process.on('uncaughtException', (error) => {
//       this.errorCount++;
//       this.logger.error('Uncaught exception in worker:', error);

//       process.send?.({
//         type: 'worker-error',
//         error: {
//           message: error.message,
//           stack: error.stack,
//           type: 'uncaughtException',
//           timestamp: Date.now(),
//         },
//         timestamp: Date.now(),
//       });

//       // Don't automatically request restart - let primary decide
//     });

//     process.on('unhandledRejection', (reason, promise) => {
//       this.errorCount++;
//       this.logger.error('Unhandled rejection in worker:', { reason, promise });

//       const errorMessage =
//         reason instanceof Error ? reason.message : String(reason);
//       const errorStack = reason instanceof Error ? reason.stack : undefined;

//       process.send?.({
//         type: 'worker-error',
//         error: {
//           message: errorMessage,
//           stack: errorStack,
//           type: 'unhandledRejection',
//           timestamp: Date.now(),
//         },
//         timestamp: Date.now(),
//       });
//     });
//   }

//   private setupWorkerMemoryMonitoring(): void {
//     setInterval(() => {
//       const memUsage = process.memoryUsage();
//       const usedMB = Math.round(memUsage.heapUsed / 1024 / 1024);

//       if (usedMB > this.config.memoryThresholdMB) {
//         this.logger.warn(`High memory usage detected: ${usedMB}MB`);

//         // Force garbage collection if available
//         if (global.gc) {
//           global.gc();
//         }
//       }
//     }, 30000);
//   }

//   private startWorkerStatsReporting(): void {
//     this.workerStatsInterval = setInterval(() => {
//       const memUsage = process.memoryUsage();
//       const stats: WorkerStats = {
//         pid: process.pid,
//         memory: memUsage,
//         uptime: process.uptime(),
//         cpuUsage: process.cpuUsage(),
//         requestCount: this.requestCount,
//         errorCount: this.errorCount,
//         lastHeartbeat: Date.now(),
//         status: 'healthy',
//         memoryUsageMB: Math.round(memUsage.heapUsed / 1024 / 1024),
//       };

//       process.send?.({
//         type: 'worker-stats',
//         data: stats,
//         timestamp: Date.now(),
//       });
//     }, 60000);
//   }

//   private setupRequestCounter(app: NestExpressApplication): void {
//     try {
//       const instance = app.getHttpAdapter().getInstance();

//       if (typeof instance.use === 'function') {
//         instance.use((req: any, res: any, next: any) => {
//           this.requestCount++;

//           const startTime = Date.now();
//           res.on('finish', () => {
//             const duration = Date.now() - startTime;

//             if (res.statusCode >= 400) {
//               this.errorCount++;
//             }

//             // Log slow requests
//             if (duration > 5000) {
//               // 5 seconds
//               this.logger.warn(
//                 `Slow request: ${req.method} ${req.url} - ${duration}ms`,
//               );
//             }
//           });

//           next();
//         });

//         this.logger.log('Request counter middleware installed');
//       }
//     } catch (error) {
//       this.logger.error('Failed to setup request counter:', error);
//     }
//   }

//   async getHealthStatus(): Promise<{
//     status: 'healthy' | 'degraded';
//     workers: {
//       total: number;
//       healthy: number;
//       required: number;
//     };
//     uptime: number;
//     requests: number;
//     errors: number;
//     memory: number;
//   }> {
//     const stats = await this.getStats();
//     const healthyWorkers = Object.values(stats.workers).filter(
//       (w) => w.status === 'healthy',
//     ).length;

//     const isHealthy =
//       healthyWorkers > 0 &&
//       healthyWorkers >= Math.ceil(this.getOptimalWorkerCount() * 0.5);

//     return {
//       status: isHealthy ? 'healthy' : 'degraded',
//       workers: {
//         total: Object.keys(stats.workers).length,
//         healthy: healthyWorkers,
//         required: this.getOptimalWorkerCount(),
//       },
//       uptime: stats.uptime,
//       requests: stats.totalRequests,
//       errors: stats.totalErrors,
//       memory: Math.round(stats.memoryUsage.heapUsed / 1024 / 1024),
//     };
//   }
// }
