// import { Injectable, Logger } from '@nestjs/common';
// import * as cluster from 'cluster';
// import * as os from 'os';
// import { NestFastifyApplication } from '@nestjs/platform-fastify';

// interface WorkerStats {
//   pid: number;
//   memory: NodeJS.MemoryUsage;
//   uptime: number;
//   cpuUsage: NodeJS.CpuUsage;
//   requestCount: number;
//   errorCount: number;
// }

// interface WorkerMessage {
//   type:
//     | 'health-check'
//     | 'health-response'
//     | 'worker-stats'
//     | 'worker-error'
//     | 'restart-request'
//     | 'request-count'
//     | 'get-stats'
//     | 'stats-response';
//   data?: any;
//   error?: any;
//   id?: string;
// }

// interface ClusterStats {
//   masterPid: number;
//   workers: Record<number, WorkerStats>;
// }

// @Injectable()
// export class ClusterService {
//   private readonly logger = new Logger(ClusterService.name);
//   private readonly numCPUs = os.cpus().length;
//   private readonly workers = new Map<number, cluster.Worker>();
//   private readonly workerStats = new Map<number, WorkerStats>();
//   private shutdownInProgress = false;
//   private pendingMessages = new Map<
//     string,
//     { resolve: (data: any) => void; reject: (err: any) => void }
//   >();
//   private requestCount = 0;
//   private errorCount = 0;

//   isMaster(): boolean {
//     return (cluster as any).isPrimary !== undefined
//       ? (cluster as any).isPrimary
//       : (cluster as any).isMaster;
//   }

//   createWorkers(): void {
//     const workerCount = this.getOptimalWorkerCount();

//     this.logger.log(`Master ${process.pid} is running`);
//     this.logger.log(
//       `Starting ${workerCount} workers on ${this.numCPUs} cores...`,
//     );

//     for (let i = 0; i < workerCount; i++) {
//       this.createWorker();
//     }

//     this.setupMasterEventHandlers();
//     this.setupGracefulShutdown();
//     this.startHealthMonitoring();
//     this.startStatsCollection();
//   }

//   async getStats(): Promise<ClusterStats> {
//     if (this.isMaster()) {
//       return {
//         masterPid: process.pid,
//         workers: Object.fromEntries(this.workerStats.entries()),
//       };
//     } else {
//       const id = Math.random().toString(36).slice(2);
//       process.send?.({ type: 'get-stats', id });

//       return new Promise((resolve, reject) => {
//         const timeout = setTimeout(() => {
//           this.pendingMessages.delete(id);
//           reject(new Error('Timeout waiting for cluster stats'));
//         }, 5000);

//         this.pendingMessages.set(id, {
//           resolve: (data) => {
//             clearTimeout(timeout);
//             resolve(data);
//           },
//           reject: (err) => {
//             clearTimeout(timeout);
//             reject(err);
//           },
//         });
//       });
//     }
//   }

//   private getOptimalWorkerCount(): number {
//     const maxWorkers = parseInt(process.env.MAX_WORKERS || '0');
//     const minWorkers = parseInt(process.env.MIN_WORKERS || '1');

//     if (maxWorkers > 0) {
//       return Math.min(maxWorkers, this.numCPUs);
//     }

//     return Math.max(minWorkers, Math.min(this.numCPUs, 8));
//   }

//   private createWorker(): void {
//     const worker = (cluster as any).fork();

//     if (!worker.id) {
//       this.logger.error('Failed to create worker - no ID');
//       return;
//     }

//     this.workers.set(worker.id, worker);

//     worker.on('message', (message: WorkerMessage) => {
//       this.handleWorkerMessage(worker, message);
//     });

//     this.setupWorkerHealthCheck(worker);

//     this.logger.log(`Worker ${worker.id} (PID: ${worker.process.pid}) created`);
//   }

//   private setupMasterEventHandlers(): void {
//     (cluster as any).on(
//       'exit',
//       (
//         worker: {
//           id: number;
//           process: { pid: any };
//           exitedAfterDisconnect: any;
//         },
//         code: any,
//         signal: any,
//       ) => {
//         this.logger.warn(
//           `Worker ${worker.id} (PID: ${worker.process.pid}) died (code=${code}, signal=${signal})`,
//         );

//         this.workers.delete(worker.id);
//         this.workerStats.delete(worker.id);

//         if (!worker.exitedAfterDisconnect && !this.shutdownInProgress) {
//           this.logger.log('Restarting worker...');
//           setTimeout(() => this.createWorker(), 1000);
//         }
//       },
//     );

//     (cluster as any).on('online', (worker) => {
//       this.logger.log(
//         `Worker ${worker.id} (PID: ${worker.process.pid}) is online`,
//       );
//     });

//     (cluster as any).on('listening', (worker, address) => {
//       this.logger.log(
//         `Worker ${worker.id} (PID: ${worker.process.pid}) listening on ${address.address}:${address.port}`,
//       );
//     });
//   }

//   private setupWorkerHealthCheck(worker: cluster.Worker): void {
//     if (!worker.id) return;

//     const interval = setInterval(() => {
//       if (worker.isDead() || this.shutdownInProgress) {
//         clearInterval(interval);
//         return;
//       }

//       worker.send({ type: 'health-check' });

//       const timeout = setTimeout(() => {
//         this.logger.warn(
//           `Worker ${worker.id} (PID: ${worker.process.pid}) failed health check`,
//         );
//         this.restartWorker(worker);
//       }, 10000);

//       const handler = (msg: WorkerMessage) => {
//         if (msg.type === 'health-response') {
//           clearTimeout(timeout);
//           worker.removeListener('message', handler);
//         }
//       };

//       worker.on('message', handler);
//     }, 30000);
//   }

//   private handleWorkerMessage(
//     worker: cluster.Worker,
//     msg: WorkerMessage,
//   ): void {
//     switch (msg.type) {
//       case 'worker-stats':
//         this.workerStats.set(worker.id, msg.data as WorkerStats);
//         break;
//       case 'worker-error':
//         this.logger.error(`Worker ${worker.id} error:`, msg.error);
//         this.handleWorkerError(worker, msg.error);
//         break;
//       case 'restart-request':
//         this.logger.log(`Worker ${worker.id} requested restart`);
//         this.restartWorker(worker);
//         break;
//       case 'get-stats':
//         const stats = {
//           masterPid: process.pid,
//           workers: Object.fromEntries(this.workerStats.entries()),
//         };
//         worker.send({ type: 'stats-response', data: stats, id: msg.id });
//         break;
//       default:
//         this.logger.debug(`Unknown message from worker ${worker.id}:`, msg);
//     }
//   }

//   private handleWorkerError(worker: cluster.Worker, error: any): void {
//     if (['uncaughtException', 'unhandledRejection'].includes(error?.type)) {
//       this.logger.error(`Fatal error in worker ${worker.id}, restarting...`);
//       this.restartWorker(worker);
//     }
//   }

//   private restartWorker(worker: cluster.Worker): void {
//     if (!worker.id || this.shutdownInProgress) return;

//     this.logger.log(`Restarting worker ${worker.id}...`);

//     this.createWorker();

//     setTimeout(() => worker.kill('SIGTERM'), 2000);
//   }

//   private startHealthMonitoring(): void {
//     setInterval(() => {
//       const alive = Array.from(this.workers.values()).filter(
//         (w) => !w.isDead(),
//       );
//       const required = this.getOptimalWorkerCount();

//       if (alive.length < required && !this.shutdownInProgress) {
//         this.logger.warn(
//           `Only ${alive.length}/${required} workers alive. Spawning replacements...`,
//         );
//         for (let i = 0; i < required - alive.length; i++) {
//           this.createWorker();
//         }
//       }
//     }, 60000);
//   }

//   private startStatsCollection(): void {
//     setInterval(() => {
//       const stats = this.getClusterStats();
//       this.logger.log(
//         `Cluster stats: ${stats.totalWorkers} total, ${stats.activeWorkers} active, avg memory ${stats.avgMemoryUsageMB}MB`,
//       );
//     }, 300000);
//   }

//   private getClusterStats() {
//     const workers = Array.from(this.workerStats.values());
//     const totalWorkers = this.workers.size;
//     const activeWorkers = workers.length;

//     const avgMemoryUsageMB =
//       workers.reduce((sum, s) => sum + s.memory.heapUsed, 0) /
//       (workers.length || 1) /
//       1024 /
//       1024;

//     return {
//       totalWorkers,
//       activeWorkers,
//       avgMemoryUsageMB: Math.round(avgMemoryUsageMB),
//     };
//   }

//   private setupGracefulShutdown(): void {
//     const shutdown = async (signal: string) => {
//       if (this.shutdownInProgress) return;
//       this.shutdownInProgress = true;

//       this.logger.log(`Master received ${signal}. Shutting down...`);
//       (cluster as any).disconnect();

//       const shutdowns = Array.from(this.workers.values()).map((w) =>
//         this.shutdownWorker(w),
//       );
//       await Promise.allSettled(shutdowns);

//       this.logger.log('All workers shut down');
//       process.exit(0);
//     };

//     process.on('SIGTERM', () => shutdown('SIGTERM'));
//     process.on('SIGINT', () => shutdown('SIGINT'));
//   }

//   private shutdownWorker(worker: cluster.Worker): Promise<void> {
//     return new Promise((resolve) => {
//       const timeout = setTimeout(() => {
//         this.logger.warn(
//           `Force killing worker ${worker.id} (PID: ${worker.process.pid})`,
//         );
//         worker.kill('SIGKILL');
//         resolve();
//       }, 15000);

//       worker.on('disconnect', () => {
//         clearTimeout(timeout);
//         resolve();
//       });

//       worker.disconnect();
//     });
//   }

//   setupWorkerProcess(app: NestFastifyApplication): void {
//     if (this.isMaster()) return;

//     this.requestCount = 0;
//     this.errorCount = 0;

//     process.on('message', (msg: WorkerMessage) => {
//       if (msg.type === 'health-check') {
//         process.send?.({ type: 'health-response' });
//       } else if (msg.type === 'stats-response') {
//         const pending = this.pendingMessages.get(msg.id!);
//         if (pending) {
//           pending.resolve(msg.data);
//           this.pendingMessages.delete(msg.id!);
//         }
//       }
//     });

//     this.startWorkerStatsReporting();
//     this.setupRequestCounter(app);

//     process.on('uncaughtException', (error) => {
//       this.errorCount++;
//       this.logger.error('Uncaught exception in worker:', error);
//       process.send?.({
//         type: 'worker-error',
//         error: {
//           message: error.message,
//           stack: error.stack,
//           type: 'uncaughtException',
//         },
//       });
//       process.send?.({ type: 'restart-request' });
//     });

//     process.on('unhandledRejection', (reason) => {
//       this.errorCount++;
//       this.logger.error('Unhandled rejection in worker:', reason);
//       process.send?.({
//         type: 'worker-error',
//         error: { message: reason?.toString(), type: 'unhandledRejection' },
//       });
//     });

//     this.logger.log(`Worker ${process.pid} initialized`);
//   }

//   private startWorkerStatsReporting(): void {
//     setInterval(() => {
//       process.send?.({
//         type: 'worker-stats',
//         data: {
//           pid: process.pid,
//           memory: process.memoryUsage(),
//           uptime: process.uptime(),
//           cpuUsage: process.cpuUsage(),
//           requestCount: this.requestCount,
//           errorCount: this.errorCount,
//         } as WorkerStats,
//       });
//     }, 60000);
//   }

//   private setupRequestCounter(app: NestFastifyApplication): void {
//     const fastify = app.getHttpAdapter().getInstance();
//     fastify.addHook('onResponse', () => {
//       this.requestCount++;
//     });
//   }
// }
