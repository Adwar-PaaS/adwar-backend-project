import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import cluster, { Worker } from 'node:cluster';
import * as os from 'os';
import { NestExpressApplication } from '@nestjs/platform-express';
import { EventEmitter } from 'node:events';
import { performance } from 'node:perf_hooks';

// Enhanced interfaces with more comprehensive tracking
interface WorkerStats {
  readonly pid: number;
  readonly memory: NodeJS.MemoryUsage;
  readonly uptime: number;
  readonly cpuUsage: NodeJS.CpuUsage;
  readonly requestCount: number;
  readonly errorCount: number;
  readonly lastHeartbeat: number;
  readonly status:
    | 'healthy'
    | 'unhealthy'
    | 'restarting'
    | 'draining'
    | 'starting';
  readonly memoryUsageMB: number;
  readonly avgResponseTime: number;
  readonly load: number; // Current load factor for round-robin
  readonly startTime: number;
  readonly restartCount: number;
  readonly lastRequestTime: number;
  readonly version: string;
}

interface WorkerMessage {
  readonly type:
    | 'health-check'
    | 'health-response'
    | 'worker-stats'
    | 'worker-error'
    | 'restart-request'
    | 'get-stats'
    | 'stats-response'
    | 'shutdown'
    | 'drain'
    | 'ready'
    | 'performance-metrics';
  readonly data?: unknown;
  readonly error?: {
    message: string;
    stack?: string;
    type: string;
    timestamp: number;
    workerId?: number;
  };
  readonly id?: string;
  readonly timestamp: number;
  readonly workerId?: number;
}

interface ClusterStats {
  readonly masterPid: number;
  readonly workers: Record<number, WorkerStats>;
  readonly totalRequests: number;
  readonly totalErrors: number;
  readonly uptime: number;
  readonly memoryUsage: NodeJS.MemoryUsage;
  readonly clusterHealth: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
  readonly loadBalancerStats: {
    algorithm: string;
    currentWorker: number;
    requestDistribution: Record<number, number>;
  };
  readonly performanceMetrics: {
    avgResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    requestsPerSecond: number;
  };
}

interface ClusterConfig {
  readonly maxWorkers: number;
  readonly minWorkers: number;
  readonly healthCheckInterval: number;
  readonly healthCheckTimeout: number;
  readonly restartDelay: number;
  readonly shutdownTimeout: number;
  readonly maxRestarts: number;
  readonly restartWindow: number;
  readonly memoryThresholdMB: number;
  readonly maxMemoryThresholdMB: number;
  readonly loadBalanceAlgorithm:
    | 'round-robin'
    | 'least-connections'
    | 'weighted-round-robin';
  readonly drainTimeout: number;
  readonly maxConcurrentRestarts: number;
  readonly performanceMonitoringInterval: number;
  readonly autoScale: boolean;
  readonly scaleUpThreshold: number;
  readonly scaleDownThreshold: number;
  readonly minHealthyWorkers: number;
}

interface LoadBalancer {
  selectWorker(): Worker | null;
  updateWorkerLoad(workerId: number, load: number): void;
  removeWorker(workerId: number): void;
  addWorker(worker: Worker): void;
  getStats(): Record<string, any>;
}

// Round-robin load balancer implementation
class RoundRobinLoadBalancer implements LoadBalancer {
  private currentIndex = 0;
  private workers: Worker[] = [];
  private workerLoads = new Map<number, number>();
  private requestCounts = new Map<number, number>();

  selectWorker(): Worker | null {
    const healthyWorkers = this.workers.filter((w) => !w.isDead());
    if (healthyWorkers.length === 0) return null;

    const worker = healthyWorkers[this.currentIndex % healthyWorkers.length];
    this.currentIndex = (this.currentIndex + 1) % healthyWorkers.length;

    // Update request count for this worker
    const currentCount = this.requestCounts.get(worker.id!) || 0;
    this.requestCounts.set(worker.id!, currentCount + 1);

    return worker;
  }

  updateWorkerLoad(workerId: number, load: number): void {
    this.workerLoads.set(workerId, load);
  }

  removeWorker(workerId: number): void {
    this.workers = this.workers.filter((w) => w.id !== workerId);
    this.workerLoads.delete(workerId);
    this.requestCounts.delete(workerId);
    // Reset index if it's out of bounds
    if (this.currentIndex >= this.workers.length) {
      this.currentIndex = 0;
    }
  }

  addWorker(worker: Worker): void {
    if (!this.workers.find((w) => w.id === worker.id)) {
      this.workers.push(worker);
      this.workerLoads.set(worker.id!, 0);
      this.requestCounts.set(worker.id!, 0);
    }
  }

  getStats(): Record<string, any> {
    return {
      algorithm: 'round-robin',
      currentIndex: this.currentIndex,
      totalWorkers: this.workers.length,
      requestDistribution: Object.fromEntries(this.requestCounts.entries()),
    };
  }
}

// Weighted round-robin implementation
class WeightedRoundRobinLoadBalancer implements LoadBalancer {
  private workers: Array<{
    worker: Worker;
    weight: number;
    currentWeight: number;
  }> = [];
  private requestCounts = new Map<number, number>();

  selectWorker(): Worker | null {
    const healthyWorkers = this.workers.filter((w) => !w.worker.isDead());
    if (healthyWorkers.length === 0) return null;

    // Find worker with highest current weight
    let selected = healthyWorkers[0];
    for (const workerInfo of healthyWorkers) {
      if (workerInfo.currentWeight > selected.currentWeight) {
        selected = workerInfo;
      }
    }

    // Update weights
    const totalWeight = healthyWorkers.reduce((sum, w) => sum + w.weight, 0);
    selected.currentWeight -= totalWeight;

    for (const workerInfo of healthyWorkers) {
      workerInfo.currentWeight += workerInfo.weight;
    }

    const currentCount = this.requestCounts.get(selected.worker.id!) || 0;
    this.requestCounts.set(selected.worker.id!, currentCount + 1);

    return selected.worker;
  }

  updateWorkerLoad(workerId: number, load: number): void {
    const workerInfo = this.workers.find((w) => w.worker.id === workerId);
    if (workerInfo) {
      // Adjust weight based on performance (lower load = higher weight)
      workerInfo.weight = Math.max(1, Math.round(10 - load * 9));
    }
  }

  removeWorker(workerId: number): void {
    this.workers = this.workers.filter((w) => w.worker.id !== workerId);
    this.requestCounts.delete(workerId);
  }

  addWorker(worker: Worker): void {
    if (!this.workers.find((w) => w.worker.id === worker.id)) {
      this.workers.push({
        worker,
        weight: 5, // Default weight
        currentWeight: 5,
      });
      this.requestCounts.set(worker.id!, 0);
    }
  }

  getStats(): Record<string, any> {
    return {
      algorithm: 'weighted-round-robin',
      workers: this.workers.map((w) => ({
        id: w.worker.id,
        weight: w.weight,
        currentWeight: w.currentWeight,
      })),
      requestDistribution: Object.fromEntries(this.requestCounts.entries()),
    };
  }
}

// Least connections load balancer
class LeastConnectionsLoadBalancer implements LoadBalancer {
  private workerConnections = new Map<number, number>();
  private workers: Worker[] = [];
  private requestCounts = new Map<number, number>();

  selectWorker(): Worker | null {
    const healthyWorkers = this.workers.filter((w) => !w.isDead());
    if (healthyWorkers.length === 0) return null;

    // Find worker with least connections
    let selected = healthyWorkers[0];
    let minConnections = this.workerConnections.get(selected.id!) || 0;

    for (const worker of healthyWorkers) {
      const connections = this.workerConnections.get(worker.id!) || 0;
      if (connections < minConnections) {
        selected = worker;
        minConnections = connections;
      }
    }

    const currentCount = this.requestCounts.get(selected.id!) || 0;
    this.requestCounts.set(selected.id!, currentCount + 1);

    return selected;
  }

  updateWorkerLoad(workerId: number, load: number): void {
    // For least connections, load represents active connections
    this.workerConnections.set(workerId, Math.round(load * 100));
  }

  removeWorker(workerId: number): void {
    this.workers = this.workers.filter((w) => w.id !== workerId);
    this.workerConnections.delete(workerId);
    this.requestCounts.delete(workerId);
  }

  addWorker(worker: Worker): void {
    if (!this.workers.find((w) => w.id === worker.id)) {
      this.workers.push(worker);
      this.workerConnections.set(worker.id!, 0);
      this.requestCounts.set(worker.id!, 0);
    }
  }

  getStats(): Record<string, any> {
    return {
      algorithm: 'least-connections',
      connections: Object.fromEntries(this.workerConnections.entries()),
      requestDistribution: Object.fromEntries(this.requestCounts.entries()),
    };
  }
}

@Injectable()
export class ClusterService extends EventEmitter implements OnModuleDestroy {
  private readonly logger = new Logger(ClusterService.name);
  private readonly numCPUs = os.cpus().length;
  private readonly workers = new Map<number, Worker>();
  private readonly workerStats = new Map<number, WorkerStats>();
  private readonly workerPendingChecks = new Map<
    number,
    Map<string, NodeJS.Timeout>
  >();
  private clusterRestarts: Array<{
    timestamp: number;
    workerId: number;
    reason: string;
  }> = [];
  private readonly config: ClusterConfig;
  private readonly loadBalancer: LoadBalancer;
  private readonly performanceMetrics = {
    responseTimes: [] as number[],
    requestsPerSecond: 0,
    lastRequestCount: 0,
    lastMetricsTime: Date.now(),
  };

  private shutdownInProgress = false;
  private readonly pendingMessages = new Map<
    string,
    {
      resolve: (data: unknown) => void;
      reject: (err: Error) => void;
      timeout: NodeJS.Timeout;
    }
  >();

  private requestCount = 0;
  private errorCount = 0;
  private readonly startTime = Date.now();
  private currentlyRestarting = new Set<number>();
  private drainingWorkers = new Set<number>();

  // Enhanced monitoring intervals
  private healthMonitorInterval?: NodeJS.Timeout;
  private statsCollectionInterval?: NodeJS.Timeout;
  private workerStatsInterval?: NodeJS.Timeout;
  private memoryMonitorInterval?: NodeJS.Timeout;
  private performanceMonitorInterval?: NodeJS.Timeout;
  private autoScaleInterval?: NodeJS.Timeout;
  private circuitBreakerInterval?: NodeJS.Timeout;

  constructor() {
    super();
    this.config = this.loadConfig();
    this.loadBalancer = this.createLoadBalancer();
    this.setupEventHandlers();
  }

  onModuleDestroy() {
    this.cleanup();
  }

  private loadConfig(): ClusterConfig {
    return {
      maxWorkers: this.parseEnvInt('MAX_WORKERS', 0),
      minWorkers: this.parseEnvInt('MIN_WORKERS', 1),
      healthCheckInterval: this.parseEnvInt('HEALTH_CHECK_INTERVAL', 30000),
      healthCheckTimeout: this.parseEnvInt('HEALTH_CHECK_TIMEOUT', 10000),
      restartDelay: this.parseEnvInt('RESTART_DELAY', 2000),
      shutdownTimeout: this.parseEnvInt('SHUTDOWN_TIMEOUT', 15000),
      maxRestarts: this.parseEnvInt('MAX_RESTARTS', 3),
      restartWindow: this.parseEnvInt('RESTART_WINDOW', 300000),
      memoryThresholdMB: this.parseEnvInt('MEMORY_THRESHOLD_MB', 400),
      maxMemoryThresholdMB: this.parseEnvInt('MAX_MEMORY_THRESHOLD_MB', 700),
      loadBalanceAlgorithm:
        (process.env.LOAD_BALANCE_ALGORITHM as any) || 'round-robin',
      drainTimeout: this.parseEnvInt('DRAIN_TIMEOUT', 30000),
      maxConcurrentRestarts: this.parseEnvInt('MAX_CONCURRENT_RESTARTS', 1),
      performanceMonitoringInterval: this.parseEnvInt(
        'PERFORMANCE_MONITORING_INTERVAL',
        60000,
      ),
      autoScale: process.env.AUTO_SCALE === 'true',
      scaleUpThreshold: parseFloat(process.env.SCALE_UP_THRESHOLD || '0.8'),
      scaleDownThreshold: parseFloat(process.env.SCALE_DOWN_THRESHOLD || '0.3'),
      minHealthyWorkers: this.parseEnvInt('MIN_HEALTHY_WORKERS', 1),
    };
  }

  private parseEnvInt(key: string, defaultValue: number): number {
    const value = process.env[key];
    if (!value) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : Math.max(0, parsed);
  }

  private createLoadBalancer(): LoadBalancer {
    switch (this.config.loadBalanceAlgorithm) {
      case 'least-connections':
        return new LeastConnectionsLoadBalancer();
      case 'weighted-round-robin':
        return new WeightedRoundRobinLoadBalancer();
      case 'round-robin':
      default:
        return new RoundRobinLoadBalancer();
    }
  }

  private setupEventHandlers(): void {
    this.on('worker-created', (workerId: number) => {
      this.logger.log(`Worker ${workerId} created successfully`);
    });

    this.on(
      'worker-died',
      (workerId: number, code: number, signal: string | null) => {
        this.logger.warn(
          `Worker ${workerId} died (code=${code}, signal=${signal ?? 'unknown'})`,
        );
        this.currentlyRestarting.delete(workerId);
        this.drainingWorkers.delete(workerId);
      },
    );

    this.on('worker-unhealthy', (workerId: number, reason: string) => {
      this.logger.warn(`Worker ${workerId} marked as unhealthy: ${reason}`);
    });

    this.on('memory-warning', (workerId: number, memoryMB: number) => {
      this.logger.warn(`Worker ${workerId} high memory usage: ${memoryMB}MB`);
    });

    this.on('worker-drained', (workerId: number) => {
      this.logger.log(`Worker ${workerId} successfully drained`);
    });

    this.on('cluster-degraded', () => {
      this.logger.error(
        'Cluster health is degraded - taking corrective action',
      );
      this.handleClusterDegradation();
    });

    this.on('performance-alert', (metrics: any) => {
      this.logger.warn('Performance alert triggered:', metrics);
    });
  }

  // Enhanced worker selection using load balancer
  selectWorkerForRequest(): Worker | null {
    return this.loadBalancer.selectWorker();
  }

  isPrimary(): boolean {
    return cluster.isPrimary;
  }

  createWorkers(): void {
    if (!this.isPrimary()) {
      throw new Error(
        'createWorkers() can only be called from primary process',
      );
    }

    const workerCount = this.getOptimalWorkerCount();
    this.logger.log(
      `Primary ${process.pid} starting ${workerCount} workers on ${this.numCPUs} cores`,
    );
    this.logger.log(
      `Using ${this.config.loadBalanceAlgorithm} load balancing algorithm`,
    );

    // Stagger worker creation to avoid resource contention
    for (let i = 0; i < workerCount; i++) {
      setTimeout(() => {
        this.createWorker();
      }, i * 1500); // Increased delay for better stability
    }

    this.setupPrimaryEventHandlers();
    this.setupGracefulShutdown();
    this.startHealthMonitoring();
    this.startStatsCollection();
    this.startMemoryMonitoring();
    this.startPerformanceMonitoring();

    if (this.config.autoScale) {
      this.startAutoScaling();
    }

    this.logger.log('Enhanced cluster service initialized successfully');
  }

  private getOptimalWorkerCount(): number {
    const { maxWorkers, minWorkers } = this.config;
    const maxLimit =
      maxWorkers > 0 ? Math.min(maxWorkers, this.numCPUs) : this.numCPUs;

    let desired: number;

    if (maxWorkers === 0) {
      const totalMemoryMB = os.totalmem() / (1024 * 1024);
      const memoryBased = Math.floor(totalMemoryMB / 600); // More conservative memory usage
      const envCap = process.env.NODE_ENV === 'production' ? 12 : 6; // Increased limits
      desired = Math.min(memoryBased, envCap, maxLimit);
    } else {
      desired = maxLimit;
    }

    const finalCount = Math.min(Math.max(minWorkers, desired), maxLimit);

    if (finalCount < minWorkers) {
      this.logger.warn(
        `Worker count capped at ${finalCount} (min is ${minWorkers}) due to system limits`,
      );
    }

    return finalCount;
  }

  private createWorker(): Worker | null {
    if (this.shutdownInProgress) {
      return null;
    }

    try {
      const worker = cluster.fork({
        ...process.env,
        WORKER_START_TIME: Date.now().toString(),
        WORKER_VERSION: process.env.npm_package_version || '1.0.0',
      });

      if (!worker.id) {
        this.logger.error('Failed to create worker - invalid worker object');
        return null;
      }

      this.workers.set(worker.id, worker);
      this.workerPendingChecks.set(worker.id, new Map());
      this.loadBalancer.addWorker(worker);

      // Initialize worker stats
      this.workerStats.set(worker.id, {
        ...this.createDefaultWorkerStats(),
        pid: worker.process.pid!,
        startTime: Date.now(),
        version: process.env.npm_package_version || '1.0.0',
        status: 'starting',
      });

      worker.on('message', (message: unknown) => {
        if (this.isValidWorkerMessage(message)) {
          this.handleWorkerMessage(worker, message);
        }
      });

      worker.on('error', (error) => {
        this.logger.error(`Worker ${worker.id} error:`, error);
        this.handleWorkerFailure(worker, error.message);
      });

      worker.on('exit', (code, signal) => {
        this.logger.log(
          `Worker ${worker.id} exited with code ${code} and signal ${signal}`,
        );
      });

      // Delayed health check setup to allow worker initialization
      setTimeout(() => {
        if (!worker.isDead()) {
          this.setupWorkerHealthCheck(worker);
          // Mark worker as ready after health check setup
          const stats = this.workerStats.get(worker.id);
          if (stats) {
            this.workerStats.set(worker.id, { ...stats, status: 'healthy' });
          }
        }
      }, 15000); // Increased initialization time

      this.emit('worker-created', worker.id);
      this.logger.log(
        `Worker ${worker.id} (PID: ${worker.process.pid}) created`,
      );

      return worker;
    } catch (error) {
      this.logger.error('Failed to create worker:', error);
      return null;
    }
  }

  // Enhanced worker restart with draining
  private async restartWorkerGracefully(
    worker: Worker,
    reason: string,
  ): Promise<void> {
    if (!worker.id || this.shutdownInProgress || worker.isDead()) {
      return;
    }

    if (this.currentlyRestarting.has(worker.id)) {
      this.logger.debug(`Worker ${worker.id} already being restarted`);
      return;
    }

    // Check if we can restart (don't exceed concurrent restart limit)
    if (this.currentlyRestarting.size >= this.config.maxConcurrentRestarts) {
      this.logger.warn(
        `Delaying restart of worker ${worker.id} - too many concurrent restarts`,
      );
      setTimeout(() => this.restartWorkerGracefully(worker, reason), 5000);
      return;
    }

    this.currentlyRestarting.add(worker.id);
    this.logger.log(
      `Initiating graceful restart of worker ${worker.id} due to: ${reason}`,
    );

    try {
      // Step 1: Drain the worker
      await this.drainWorker(worker);

      // Step 2: Create replacement worker first (zero-downtime)
      const newWorker = this.createWorker();
      if (!newWorker) {
        throw new Error('Failed to create replacement worker');
      }

      // Step 3: Wait for new worker to be ready
      await this.waitForWorkerReady(newWorker);

      // Step 4: Shutdown old worker
      await this.shutdownWorker(worker);

      this.logger.log(
        `Successfully restarted worker ${worker.id} -> ${newWorker.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to gracefully restart worker ${worker.id}:`,
        error,
      );
      // Fallback to force restart
      worker.kill('SIGKILL');
    } finally {
      this.currentlyRestarting.delete(worker.id);
    }
  }

  // New: Drain worker before restart
  private async drainWorker(worker: Worker): Promise<void> {
    return new Promise((resolve) => {
      if (worker.isDead()) {
        resolve();
        return;
      }

      this.drainingWorkers.add(worker.id!);
      this.loadBalancer.removeWorker(worker.id!); // Remove from load balancer

      const stats = this.workerStats.get(worker.id!);
      if (stats) {
        this.workerStats.set(worker.id!, { ...stats, status: 'draining' });
      }

      try {
        worker.send({ type: 'drain', timestamp: Date.now() });
      } catch (error) {
        this.logger.error(
          `Failed to send drain signal to worker ${worker.id}:`,
          error,
        );
      }

      // Wait for drain timeout or until no active connections
      const timeout = setTimeout(() => {
        this.drainingWorkers.delete(worker.id!);
        this.emit('worker-drained', worker.id!);
        resolve();
      }, this.config.drainTimeout);

      // Monitor for completion of draining
      const checkDraining = setInterval(() => {
        const currentStats = this.workerStats.get(worker.id!);
        if (currentStats && currentStats.load <= 0.1) {
          // Very low load indicates draining complete
          clearTimeout(timeout);
          clearInterval(checkDraining);
          this.drainingWorkers.delete(worker.id!);
          this.emit('worker-drained', worker.id!);
          resolve();
        }
      }, 1000);
    });
  }

  // Wait for worker to be ready and healthy
  private async waitForWorkerReady(worker: Worker): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Worker ${worker.id} failed to become ready in time`));
      }, 30000);

      const checkReady = setInterval(() => {
        const stats = this.workerStats.get(worker.id!);
        if (stats && stats.status === 'healthy') {
          clearTimeout(timeout);
          clearInterval(checkReady);
          resolve();
        }
      }, 1000);
    });
  }

  // Enhanced performance monitoring
  private startPerformanceMonitoring(): void {
    this.performanceMonitorInterval = setInterval(() => {
      this.collectPerformanceMetrics();
      this.analyzePerformance();
    }, this.config.performanceMonitoringInterval);
  }

  private collectPerformanceMetrics(): void {
    const now = Date.now();
    const timeDiff = now - this.performanceMetrics.lastMetricsTime;
    const requestDiff =
      this.requestCount - this.performanceMetrics.lastRequestCount;

    this.performanceMetrics.requestsPerSecond = Math.round(
      (requestDiff / timeDiff) * 1000,
    );
    this.performanceMetrics.lastRequestCount = this.requestCount;
    this.performanceMetrics.lastMetricsTime = now;

    // Clean old response times (keep last 1000 samples)
    if (this.performanceMetrics.responseTimes.length > 1000) {
      this.performanceMetrics.responseTimes =
        this.performanceMetrics.responseTimes.slice(-1000);
    }
  }

  private analyzePerformance(): void {
    const { responseTimes } = this.performanceMetrics;
    if (responseTimes.length === 0) return;

    const sorted = [...responseTimes].sort((a, b) => a - b);
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const p99 = sorted[Math.floor(sorted.length * 0.99)];
    const avg =
      responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;

    // Alert on performance degradation
    if (p95 > 5000 || avg > 2000) {
      // 5s p95, 2s average
      this.emit('performance-alert', {
        p95,
        p99,
        avg,
        rps: this.performanceMetrics.requestsPerSecond,
      });
    }

    // Update performance metrics in all workers
    for (const [workerId, stats] of this.workerStats.entries()) {
      this.loadBalancer.updateWorkerLoad(workerId, stats.load);
    }
  }

  // Auto-scaling implementation
  private startAutoScaling(): void {
    this.autoScaleInterval = setInterval(() => {
      if (this.shutdownInProgress) return;

      const healthyWorkers = Array.from(this.workerStats.values()).filter(
        (s) => s.status === 'healthy',
      ).length;

      const totalWorkers = this.workers.size;
      const avgLoad = this.calculateAverageLoad();
      const optimalWorkers = this.getOptimalWorkerCount();

      // Scale up conditions
      if (
        avgLoad > this.config.scaleUpThreshold &&
        healthyWorkers < optimalWorkers &&
        totalWorkers < this.config.maxWorkers
      ) {
        this.logger.log(
          `Auto-scaling up: load=${avgLoad.toFixed(2)}, workers=${healthyWorkers}/${optimalWorkers}`,
        );
        this.createWorker();
      }

      // Scale down conditions
      if (
        avgLoad < this.config.scaleDownThreshold &&
        healthyWorkers > this.config.minWorkers &&
        healthyWorkers > this.config.minHealthyWorkers
      ) {
        this.logger.log(
          `Auto-scaling down: load=${avgLoad.toFixed(2)}, workers=${healthyWorkers}`,
        );
        this.scaleDownWorker();
      }
    }, 60000); // Check every minute
  }

  private calculateAverageLoad(): number {
    const healthyStats = Array.from(this.workerStats.values()).filter(
      (s) => s.status === 'healthy',
    );

    if (healthyStats.length === 0) return 0;

    return (
      healthyStats.reduce((sum, stats) => sum + stats.load, 0) /
      healthyStats.length
    );
  }

  private scaleDownWorker(): void {
    // Find worker with lowest load to scale down
    const candidates = Array.from(this.workerStats.entries())
      .filter(([_, stats]) => stats.status === 'healthy')
      .sort(([_, a], [__, b]) => a.load - b.load);

    if (candidates.length > 0) {
      const [workerId] = candidates[0];
      const worker = this.workers.get(workerId);
      if (worker) {
        this.logger.log(
          `Scaling down worker ${workerId} (low load: ${candidates[0][1].load})`,
        );
        this.restartWorkerGracefully(worker, 'auto-scale down');
      }
    }
  }

  // Enhanced cluster degradation handling
  private handleClusterDegradation(): void {
    const healthyWorkers = Array.from(this.workerStats.values()).filter(
      (s) => s.status === 'healthy',
    ).length;

    const requiredWorkers = Math.max(
      this.config.minHealthyWorkers,
      Math.ceil(this.getOptimalWorkerCount() * 0.5),
    );

    if (healthyWorkers < requiredWorkers) {
      this.logger.error(
        `Critical: Only ${healthyWorkers}/${requiredWorkers} healthy workers. Emergency scaling...`,
      );

      // Emergency worker creation
      const needed = requiredWorkers - healthyWorkers;
      for (let i = 0; i < needed; i++) {
        setTimeout(() => this.createWorker(), i * 500); // Faster creation in emergency
      }
    }
  }

  private createDefaultWorkerStats(): WorkerStats {
    return {
      pid: 0,
      memory: {
        heapUsed: 0,
        heapTotal: 0,
        external: 0,
        rss: 0,
        arrayBuffers: 0,
      },
      uptime: 0,
      cpuUsage: { user: 0, system: 0 },
      requestCount: 0,
      errorCount: 0,
      lastHeartbeat: Date.now(),
      status: 'starting',
      memoryUsageMB: 0,
      avgResponseTime: 0,
      load: 0,
      startTime: Date.now(),
      restartCount: 0,
      lastRequestTime: 0,
      version: '1.0.0',
    };
  }

  private isValidWorkerMessage(message: unknown): message is WorkerMessage {
    if (!message || typeof message !== 'object') return false;
    const msg = message as Record<string, unknown>;
    return (
      typeof msg.type === 'string' &&
      typeof msg.timestamp === 'number' &&
      msg.timestamp > 0
    );
  }

  private setupPrimaryEventHandlers(): void {
    cluster.on('exit', this.handleWorkerExit.bind(this));
    cluster.on('online', this.handleWorkerOnline.bind(this));
    cluster.on('listening', this.handleWorkerListening.bind(this));
  }

  private handleWorkerExit(
    worker: Worker,
    code: number,
    signal: string | null,
  ): void {
    this.emit('worker-died', worker.id, code, signal);
    this.cleanupWorker(worker.id);

    // Enhanced restart logic with circuit breaker pattern
    if (!worker.exitedAfterDisconnect && !this.shutdownInProgress) {
      if (this.shouldAutoRestart(worker.id, 'exit')) {
        this.logger.log(
          `Restarting worker ${worker.id} in ${this.config.restartDelay}ms...`,
        );
        setTimeout(() => this.createWorker(), this.config.restartDelay);
      } else {
        this.logger.error(
          `Worker ${worker.id} exceeded restart limit, not restarting`,
        );
        this.handleExcessiveRestarts();
      }
    }
  }

  private shouldAutoRestart(workerId: number, reason: string): boolean {
    const now = Date.now();

    // Clean old restart records
    this.clusterRestarts = this.clusterRestarts.filter(
      (record) => now - record.timestamp < this.config.restartWindow,
    );

    const recentRestarts = this.clusterRestarts.filter(
      (record) => record.workerId === workerId,
    );

    if (recentRestarts.length >= this.config.maxRestarts) {
      this.logger.error(
        `Worker ${workerId} exceeded restart limit (${this.config.maxRestarts} in ${this.config.restartWindow / 60000} min)`,
      );
      return false;
    }

    // Record this restart attempt
    this.clusterRestarts.push({
      timestamp: now,
      workerId,
      reason,
    });

    return true;
  }

  private handleExcessiveRestarts(): void {
    const recentRestarts = this.clusterRestarts.filter(
      (record) => Date.now() - record.timestamp < this.config.restartWindow,
    );

    if (recentRestarts.length >= this.config.maxRestarts * 2) {
      this.logger.error(
        'Cluster experiencing excessive restarts - initiating emergency mode',
      );
      this.emit('cluster-emergency', { restarts: recentRestarts.length });

      // Implement circuit breaker: pause restart attempts temporarily
      setTimeout(() => {
        this.logger.log('Emergency mode ended - resuming normal operations');
      }, 60000); // 1 minute circuit breaker
    }
  }

  private cleanupWorker(workerId: number): void {
    this.workers.delete(workerId);
    this.loadBalancer.removeWorker(workerId);
    this.currentlyRestarting.delete(workerId);
    this.drainingWorkers.delete(workerId);

    const pendingChecks = this.workerPendingChecks.get(workerId);
    if (pendingChecks) {
      for (const timeout of pendingChecks.values()) {
        clearTimeout(timeout);
      }
      this.workerPendingChecks.delete(workerId);
    }

    this.workerStats.delete(workerId);
  }

  private handleWorkerOnline(worker: Worker): void {
    this.logger.log(
      `Worker ${worker.id} (PID: ${worker.process.pid}) is online`,
    );
  }

  private handleWorkerListening(worker: Worker, address: any): void {
    this.logger.log(
      `Worker ${worker.id} (PID: ${worker.process.pid}) listening on ${address.address}:${address.port}`,
    );
  }

  private handleWorkerFailure(worker: Worker, reason: string): void {
    const stats = this.workerStats.get(worker.id!);
    if (stats) {
      this.workerStats.set(worker.id!, {
        ...stats,
        status: 'unhealthy',
        restartCount: stats.restartCount + 1,
      });
    }

    this.emit('worker-unhealthy', worker.id, reason);

    // Don't immediately restart on failure - let health check handle it
    setTimeout(() => {
      if (!worker.isDead() && !this.currentlyRestarting.has(worker.id!)) {
        this.restartWorkerGracefully(worker, reason);
      }
    }, 5000);
  }

  private setupWorkerHealthCheck(worker: Worker): void {
    if (!worker.id || worker.isDead() || this.shutdownInProgress) {
      return;
    }

    const performHealthCheck = () => {
      if (worker.isDead() || this.shutdownInProgress) {
        return;
      }

      const checkId = this.generateMessageId();
      try {
        worker.send({
          type: 'health-check',
          id: checkId,
          timestamp: Date.now(),
          workerId: worker.id,
        });
      } catch (error) {
        this.logger.error(
          `Failed to send health check to worker ${worker.id}:`,
          error,
        );
        this.handleWorkerFailure(worker, 'health check send failed');
        return;
      }

      const pending = this.workerPendingChecks.get(worker.id);
      if (pending) {
        const healthTimeout = setTimeout(() => {
          this.emit('worker-unhealthy', worker.id, 'Health check timeout');
          this.restartWorkerGracefully(worker, 'health check timeout');
          pending.delete(checkId);
        }, this.config.healthCheckTimeout);
        pending.set(checkId, healthTimeout);
      }
    };

    // Immediate health check
    setTimeout(() => performHealthCheck(), 5000);

    // Regular health checks
    const interval = setInterval(() => {
      if (!worker.isDead() && !this.shutdownInProgress) {
        performHealthCheck();
      } else {
        clearInterval(interval);
      }
    }, this.config.healthCheckInterval);

    worker.on('disconnect', () => clearInterval(interval));
    worker.on('exit', () => clearInterval(interval));
  }

  private handleWorkerMessage(worker: Worker, msg: WorkerMessage): void {
    try {
      switch (msg.type) {
        case 'health-response':
          this.handleHealthResponse(worker, msg);
          break;

        case 'worker-stats':
          this.updateWorkerStats(worker.id, msg.data as Partial<WorkerStats>);
          break;

        case 'worker-error':
          this.handleWorkerError(worker, msg.error!);
          break;

        case 'restart-request':
          this.logger.log(`Worker ${worker.id} requested restart`);
          this.restartWorkerGracefully(worker, 'worker request');
          break;

        case 'get-stats':
          this.handleStatsRequest(worker, msg.id!);
          break;

        case 'stats-response':
          this.handleStatsResponse(msg);
          break;

        case 'ready':
          this.handleWorkerReady(worker);
          break;

        case 'performance-metrics':
          this.handlePerformanceMetrics(worker, msg.data as any);
          break;

        default:
          this.logger.debug(
            `Unknown message type '${msg.type}' from worker ${worker.id}`,
          );
      }
    } catch (error) {
      this.logger.error(
        `Error handling message from worker ${worker.id}:`,
        error,
      );
    }
  }

  private handleHealthResponse(worker: Worker, msg: WorkerMessage): void {
    if (msg.id) {
      const pending = this.workerPendingChecks.get(worker.id);
      const timeout = pending?.get(msg.id);
      if (pending && timeout) {
        clearTimeout(timeout);
        pending.delete(msg.id);

        const stats = this.workerStats.get(worker.id);
        if (stats) {
          this.workerStats.set(worker.id, {
            ...stats,
            lastHeartbeat: Date.now(),
            status: stats.status === 'starting' ? 'healthy' : stats.status,
          });
        }
      }
    }
  }

  private handleWorkerReady(worker: Worker): void {
    const stats = this.workerStats.get(worker.id);
    if (stats) {
      this.workerStats.set(worker.id, {
        ...stats,
        status: 'healthy',
      });
      this.logger.log(`Worker ${worker.id} is ready and healthy`);
    }
  }

  private handlePerformanceMetrics(worker: Worker, metrics: any): void {
    if (metrics.responseTime) {
      this.performanceMetrics.responseTimes.push(metrics.responseTime);
    }

    const stats = this.workerStats.get(worker.id);
    if (stats && metrics) {
      this.workerStats.set(worker.id, {
        ...stats,
        avgResponseTime: metrics.avgResponseTime || stats.avgResponseTime,
        load: metrics.load || stats.load,
        lastRequestTime: metrics.lastRequestTime || stats.lastRequestTime,
      });
    }
  }

  private updateWorkerStats(
    workerId: number,
    stats: Partial<WorkerStats>,
  ): void {
    const existingStats =
      this.workerStats.get(workerId) || this.createDefaultWorkerStats();

    const enhancedStats: WorkerStats = {
      ...existingStats,
      ...stats,
      lastHeartbeat: Date.now(),
      memoryUsageMB: Math.round(
        (stats.memory?.heapUsed || existingStats.memory.heapUsed) / 1024 / 1024,
      ),
      status: this.evaluateWorkerHealth({ ...existingStats, ...stats }),
    };

    this.workerStats.set(workerId, enhancedStats);

    // Update load balancer with current stats
    this.loadBalancer.updateWorkerLoad(workerId, enhancedStats.load);

    // Check for memory issues
    if (enhancedStats.memoryUsageMB > this.config.memoryThresholdMB) {
      this.emit('memory-warning', workerId, enhancedStats.memoryUsageMB);

      if (enhancedStats.memoryUsageMB > this.config.maxMemoryThresholdMB) {
        this.emit('worker-unhealthy', workerId, 'Critical memory usage');
        const worker = this.workers.get(workerId);
        if (worker && !this.currentlyRestarting.has(workerId)) {
          this.restartWorkerGracefully(worker, 'critical memory usage');
        }
      }
    }
  }

  private evaluateWorkerHealth(
    stats: WorkerStats,
  ): 'healthy' | 'unhealthy' | 'restarting' | 'draining' | 'starting' {
    // Preserve current status if in transition
    if (['restarting', 'draining', 'starting'].includes(stats.status)) {
      return stats.status;
    }

    // Memory checks
    if (stats.memoryUsageMB > this.config.maxMemoryThresholdMB) {
      return 'unhealthy';
    }

    // Error rate check (more sophisticated)
    const errorRate =
      stats.requestCount > 0 ? stats.errorCount / stats.requestCount : 0;
    if (errorRate > 0.15 && stats.requestCount > 50) {
      // 15% error rate threshold
      return 'unhealthy';
    }

    // Response time check
    if (stats.avgResponseTime > 10000) {
      // 10 second average response time
      return 'unhealthy';
    }

    // Heartbeat check
    const timeSinceHeartbeat = Date.now() - stats.lastHeartbeat;
    if (timeSinceHeartbeat > this.config.healthCheckInterval * 2) {
      return 'unhealthy';
    }

    return 'healthy';
  }

  private handleWorkerError(
    worker: Worker,
    error: NonNullable<WorkerMessage['error']>,
  ): void {
    this.logger.error(`Worker ${worker.id} error:`, error);

    // Track error in stats
    const stats = this.workerStats.get(worker.id);
    if (stats) {
      this.workerStats.set(worker.id, {
        ...stats,
        errorCount: stats.errorCount + 1,
      });
    }

    if (['uncaughtException', 'unhandledRejection'].includes(error.type)) {
      this.logger.error(
        `Fatal error in worker ${worker.id}, initiating restart...`,
      );
      this.restartWorkerGracefully(worker, `fatal error: ${error.type}`);
    }
  }

  // Enhanced monitoring methods
  private startHealthMonitoring(): void {
    this.healthMonitorInterval = setInterval(() => {
      if (this.shutdownInProgress) return;

      const aliveWorkers = Array.from(this.workers.values()).filter(
        (w) => !w.isDead(),
      ).length;
      const healthyWorkers = Array.from(this.workerStats.values()).filter(
        (s) => s.status === 'healthy',
      ).length;
      const requiredWorkers = this.getOptimalWorkerCount();

      // Check if we need more workers
      if (aliveWorkers < requiredWorkers) {
        const needed = requiredWorkers - aliveWorkers;
        this.logger.warn(
          `Only ${aliveWorkers}/${requiredWorkers} workers alive (${healthyWorkers} healthy). Creating ${needed} replacements...`,
        );

        for (let i = 0; i < needed; i++) {
          setTimeout(() => this.createWorker(), i * 2000);
        }
      }

      // Check cluster health
      const healthRatio = aliveWorkers > 0 ? healthyWorkers / aliveWorkers : 0;
      if (healthRatio < 0.5) {
        this.emit('cluster-degraded');
      }

      // Clean up old restart records
      const now = Date.now();
      this.clusterRestarts = this.clusterRestarts.filter(
        (record) => now - record.timestamp < this.config.restartWindow,
      );
    }, 15000); // More frequent monitoring
  }

  private startMemoryMonitoring(): void {
    this.memoryMonitorInterval = setInterval(() => {
      const memoryUsage = process.memoryUsage();
      const usedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);

      if (usedMB > this.config.memoryThresholdMB) {
        this.logger.warn(`Primary process high memory usage: ${usedMB}MB`);
        if (global.gc) {
          try {
            global.gc();
            this.logger.debug('Performed GC on primary process');
          } catch (error) {
            this.logger.debug('GC not available');
          }
        }
      }

      // Check for memory leaks in primary process
      if (usedMB > this.config.maxMemoryThresholdMB) {
        this.logger.error(
          `Primary process critical memory usage: ${usedMB}MB - consider restart`,
        );
      }
    }, 30000);
  }

  private startStatsCollection(): void {
    this.statsCollectionInterval = setInterval(() => {
      if (this.shutdownInProgress) return;

      const stats = this.getClusterHealthSummary();
      const lbStats = this.loadBalancer.getStats();

      this.logger.log(
        `Cluster: ${stats.totalWorkers} workers (${stats.healthyWorkers} healthy), ` +
          `Requests: ${stats.totalRequests}, Errors: ${stats.errorCount}, ` +
          `Avg Memory: ${stats.avgMemoryMB}MB, RPS: ${this.performanceMetrics.requestsPerSecond}, ` +
          `LB: ${lbStats.algorithm}`,
      );

      // Log performance metrics periodically
      if (this.performanceMetrics.responseTimes.length > 0) {
        const sorted = [...this.performanceMetrics.responseTimes].sort(
          (a, b) => a - b,
        );
        const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
        const avg =
          this.performanceMetrics.responseTimes.reduce((s, t) => s + t, 0) /
          this.performanceMetrics.responseTimes.length;

        this.logger.debug(
          `Performance: Avg ${avg.toFixed(0)}ms, P95 ${p95.toFixed(0)}ms`,
        );
      }
    }, 180000); // Every 3 minutes
  }

  private getClusterHealthSummary() {
    const workers = Array.from(this.workerStats.values());
    const totalWorkers = workers.length;
    const healthyWorkers = workers.filter((w) => w.status === 'healthy').length;
    const totalRequests = workers.reduce((sum, w) => sum + w.requestCount, 0);
    const errorCount = workers.reduce((sum, w) => sum + w.errorCount, 0);
    const avgMemoryMB =
      workers.length > 0
        ? Math.round(
            workers.reduce((sum, w) => sum + w.memoryUsageMB, 0) /
              workers.length,
          )
        : 0;

    return {
      totalWorkers,
      healthyWorkers,
      totalRequests,
      errorCount,
      avgMemoryMB,
    };
  }

  // Enhanced cluster stats with performance metrics
  private getClusterStats(): ClusterStats {
    const workers = Object.fromEntries(this.workerStats.entries());
    const workerArray = Array.from(this.workerStats.values());

    const totalRequests = workerArray.reduce(
      (sum, stats) => sum + stats.requestCount,
      0,
    );
    const totalErrors = workerArray.reduce(
      (sum, stats) => sum + stats.errorCount,
      0,
    );
    const healthyWorkers = workerArray.filter(
      (w) => w.status === 'healthy',
    ).length;
    const totalWorkers = Object.keys(workers).length;

    // Calculate cluster health status
    let clusterHealth: 'healthy' | 'degraded' | 'unhealthy' | 'critical' =
      'healthy';
    const healthRatio = totalWorkers > 0 ? healthyWorkers / totalWorkers : 0;

    if (healthRatio < 0.25) {
      clusterHealth = 'critical';
    } else if (healthRatio < 0.5) {
      clusterHealth = 'unhealthy';
    } else if (healthRatio < 0.8) {
      clusterHealth = 'degraded';
    }

    // Performance metrics
    const responseTimes = this.performanceMetrics.responseTimes;
    const sortedTimes = [...responseTimes].sort((a, b) => a - b);
    const avgResponseTime =
      responseTimes.length > 0
        ? responseTimes.reduce((sum, time) => sum + time, 0) /
          responseTimes.length
        : 0;
    const p95ResponseTime =
      sortedTimes[Math.floor(sortedTimes.length * 0.95)] || 0;
    const p99ResponseTime =
      sortedTimes[Math.floor(sortedTimes.length * 0.99)] || 0;

    return {
      masterPid: process.pid,
      workers,
      totalRequests,
      totalErrors,
      uptime: Date.now() - this.startTime,
      memoryUsage: process.memoryUsage(),
      clusterHealth,
      loadBalancerStats: {
        algorithm: this.config.loadBalanceAlgorithm,
        currentWorker: 0, // This would be set by load balancer
        requestDistribution:
          this.loadBalancer.getStats().requestDistribution || {},
      },
      performanceMetrics: {
        avgResponseTime,
        p95ResponseTime,
        p99ResponseTime,
        requestsPerSecond: this.performanceMetrics.requestsPerSecond,
      },
    };
  }

  async getStats(): Promise<ClusterStats> {
    if (this.isPrimary()) {
      return this.getClusterStats();
    }
    return this.requestStatsFromPrimary();
  }

  private async requestStatsFromPrimary(): Promise<ClusterStats> {
    const id = this.generateMessageId();

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingMessages.delete(id);
        reject(new Error('Timeout waiting for cluster stats'));
      }, 8000); // Increased timeout

      this.pendingMessages.set(id, {
        resolve: (data) => {
          clearTimeout(timeout);
          resolve(data as ClusterStats);
        },
        reject: (err) => {
          clearTimeout(timeout);
          reject(err);
        },
        timeout,
      });

      if (process.send) {
        process.send({
          type: 'get-stats',
          id,
          timestamp: Date.now(),
        });
      } else {
        clearTimeout(timeout);
        this.pendingMessages.delete(id);
        reject(new Error('Process.send is not available'));
      }
    });
  }

  private handleStatsRequest(worker: Worker, messageId: string): void {
    const stats = this.getClusterStats();
    try {
      worker.send({
        type: 'stats-response',
        data: stats,
        id: messageId,
        timestamp: Date.now(),
      });
    } catch (error) {
      this.logger.error(`Failed to send stats to worker ${worker.id}:`, error);
    }
  }

  private handleStatsResponse(msg: WorkerMessage): void {
    const pending = this.pendingMessages.get(msg.id!);
    if (pending) {
      pending.resolve(msg.data);
      clearTimeout(pending.timeout);
      this.pendingMessages.delete(msg.id!);
    }
  }

  private generateMessageId(): string {
    return `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      if (this.shutdownInProgress) return;
      this.shutdownInProgress = true;

      this.logger.log(
        `Primary received ${signal}. Starting graceful shutdown...`,
      );
      this.cleanup();

      // Notify all workers to start draining
      const drainPromises = Array.from(this.workers.values()).map((w) =>
        this.drainWorker(w).catch((err) =>
          this.logger.error(`Error draining worker ${w.id}:`, err),
        ),
      );

      await Promise.allSettled(drainPromises);

      // Shutdown all workers
      const shutdownPromises = Array.from(this.workers.values()).map((w) =>
        this.shutdownWorker(w),
      );

      try {
        await Promise.allSettled(shutdownPromises);
        this.logger.log('All workers shut down gracefully');
        process.exit(0);
      } catch (error) {
        this.logger.error('Error during worker shutdown:', error);
        process.exit(1);
      }
    };

    // Handle various shutdown signals
    const signals = ['SIGTERM', 'SIGINT', 'SIGHUP'];
    signals.forEach((signal) => {
      process.on(signal as any, () => shutdown(signal));
    });

    // Handle uncaught exceptions in primary
    process.on('uncaughtException', (error) => {
      this.logger.error('Uncaught exception in primary process:', error);
      setTimeout(() => shutdown('uncaughtException'), 100);
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.logger.error('Unhandled rejection in primary process:', {
        reason,
        promise,
      });
      setTimeout(() => shutdown('unhandledRejection'), 100);
    });
  }

  private cleanup(): void {
    // Clear all intervals
    const intervals = [
      this.healthMonitorInterval,
      this.statsCollectionInterval,
      this.workerStatsInterval,
      this.memoryMonitorInterval,
      this.performanceMonitorInterval,
      this.autoScaleInterval,
      this.circuitBreakerInterval,
    ];

    intervals.forEach((interval) => {
      if (interval) {
        clearInterval(interval);
      }
    });

    // Clean up pending messages
    for (const [id, pending] of this.pendingMessages.entries()) {
      pending.reject(new Error('Shutdown in progress'));
      clearTimeout(pending.timeout);
      this.pendingMessages.delete(id);
    }

    // Clean up pending health checks
    for (const [
      workerId,
      pendingChecks,
    ] of this.workerPendingChecks.entries()) {
      for (const timeout of pendingChecks.values()) {
        clearTimeout(timeout);
      }
      pendingChecks.clear();
    }

    this.logger.log('Cleanup completed');
  }

  private async shutdownWorker(worker: Worker): Promise<void> {
    return new Promise((resolve) => {
      if (worker.isDead()) {
        resolve();
        return;
      }

      const workerId = worker.id!;
      this.logger.log(`Shutting down worker ${workerId}...`);

      const timeout = setTimeout(() => {
        this.logger.warn(
          `Force killing worker ${workerId} (PID: ${worker.process.pid})`,
        );
        try {
          worker.kill('SIGKILL');
        } catch (error) {
          this.logger.error(`Error force killing worker ${workerId}:`, error);
        }
        resolve();
      }, this.config.shutdownTimeout);

      const cleanup = () => {
        clearTimeout(timeout);
        resolve();
      };

      worker.once('disconnect', cleanup);
      worker.once('exit', cleanup);

      // Send graceful shutdown signal
      try {
        worker.send({
          type: 'shutdown',
          timestamp: Date.now(),
          workerId,
        });

        // Give worker a moment to process the shutdown message
        setTimeout(() => {
          if (!worker.isDead()) {
            worker.disconnect();
          }
        }, 1000);
      } catch (error) {
        this.logger.error(`Error shutting down worker ${workerId}:`, error);
        try {
          worker.kill('SIGTERM');
        } catch (killError) {
          this.logger.error(`Error killing worker ${workerId}:`, killError);
        }
        cleanup();
      }
    });
  }

  // Enhanced worker process setup
  setupWorkerProcess(app: NestExpressApplication): void {
    if (this.isPrimary()) {
      this.logger.warn('setupWorkerProcess called from primary process');
      return;
    }

    this.requestCount = 0;
    this.errorCount = 0;
    const startTime = Date.now();
    let activeConnections = 0;
    let draining = false;

    // Enhanced message handling for workers
    process.on('message', (msg: unknown) => {
      if (this.isValidWorkerMessage(msg)) {
        this.handlePrimaryMessage(msg, app, {
          activeConnections,
          draining: () => draining,
        });
      }
    });

    this.startWorkerStatsReporting();
    this.setupRequestCounter(
      app,
      () => activeConnections++,
      () => activeConnections--,
    );
    this.setupWorkerErrorHandling();
    this.setupWorkerMemoryMonitoring();

    // Enhanced performance monitoring for workers
    this.setupWorkerPerformanceMonitoring();

    // Send ready signal to primary
    setTimeout(() => {
      if (process.send) {
        process.send({
          type: 'ready',
          timestamp: Date.now(),
          workerId: parseInt(process.env.WORKER_ID || '0'),
        });
      }
    }, 5000);

    this.logger.log(`Worker ${process.pid} initialized successfully`);
  }

  private handlePrimaryMessage(
    msg: WorkerMessage,
    app: NestExpressApplication,
    workerState: { activeConnections: number; draining: () => boolean },
  ): void {
    switch (msg.type) {
      case 'health-check':
        this.respondToHealthCheck(msg, workerState);
        break;

      case 'drain':
        this.initiateDraining(app, workerState);
        break;

      case 'shutdown':
        this.initiateWorkerShutdown(workerState);
        break;

      case 'stats-response':
        const pending = this.pendingMessages.get(msg.id!);
        if (pending) {
          pending.resolve(msg.data);
          clearTimeout(pending.timeout);
          this.pendingMessages.delete(msg.id!);
        }
        break;

      default:
        this.logger.debug(`Unknown message type '${msg.type}' from primary`);
    }
  }

  private respondToHealthCheck(
    msg: WorkerMessage,
    workerState: { activeConnections: number; draining: () => boolean },
  ): void {
    if (process.send) {
      const memUsage = process.memoryUsage();
      const healthData = {
        status: workerState.draining() ? 'draining' : 'healthy',
        activeConnections: workerState.activeConnections,
        memory: memUsage,
        uptime: process.uptime(),
        requests: this.requestCount,
        errors: this.errorCount,
      };

      process.send({
        type: 'health-response',
        id: msg.id,
        data: healthData,
        timestamp: Date.now(),
        workerId: parseInt(process.env.WORKER_ID || '0'),
      });
    }
  }

  private initiateDraining(
    app: NestExpressApplication,
    workerState: { activeConnections: number; draining: () => boolean },
  ): void {
    this.logger.log('Worker entering drain mode...');

    // Set draining flag
    (workerState as any).draining = true;

    // Stop accepting new connections (if using HTTP server directly)
    try {
      const server = app.getHttpServer();
      if (server && typeof server.close === 'function') {
        server.close(() => {
          this.logger.log('HTTP server stopped accepting new connections');
        });
      }
    } catch (error) {
      this.logger.error('Error closing HTTP server:', error);
    }

    // Monitor active connections and notify when drained
    const checkDrained = setInterval(() => {
      if (workerState.activeConnections <= 0) {
        clearInterval(checkDrained);
        this.logger.log('Worker successfully drained');
        if (process.send) {
          process.send({
            type: 'worker-stats',
            data: { status: 'drained', activeConnections: 0 },
            timestamp: Date.now(),
          });
        }
      }
    }, 1000);

    // Force drain after timeout
    setTimeout(() => {
      clearInterval(checkDrained);
      this.logger.log('Force completing drain after timeout');
    }, this.config.drainTimeout);
  }

  private initiateWorkerShutdown(workerState: {
    activeConnections: number;
    draining: () => boolean;
  }): void {
    this.logger.log('Initiating graceful worker shutdown...');

    this.cleanup();

    // Wait for active connections to finish
    const gracefulExit = () => {
      if (workerState.activeConnections > 0) {
        this.logger.log(
          `Waiting for ${workerState.activeConnections} active connections...`,
        );
        setTimeout(gracefulExit, 1000);
      } else {
        this.logger.log('All connections closed. Exiting...');
        process.exit(0);
      }
    };

    // Start graceful exit or force after timeout
    setTimeout(() => {
      this.logger.log('Force exit after shutdown timeout');
      process.exit(0);
    }, 8000);

    gracefulExit();
  }

  private setupWorkerErrorHandling(): void {
    process.on('uncaughtException', (error) => {
      this.errorCount++;
      this.logger.error('Uncaught exception in worker:', error);

      if (process.send) {
        process.send({
          type: 'worker-error',
          error: {
            message: error.message,
            stack: error.stack,
            type: 'uncaughtException',
            timestamp: Date.now(),
            workerId: parseInt(process.env.WORKER_ID || '0'),
          },
          timestamp: Date.now(),
        });
      }

      // Give time to report error before potentially exiting
      setTimeout(() => process.exit(1), 1000);
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.errorCount++;
      this.logger.error('Unhandled rejection in worker:', { reason, promise });

      const errorMessage =
        reason instanceof Error ? reason.message : String(reason);
      const errorStack = reason instanceof Error ? reason.stack : undefined;

      if (process.send) {
        process.send({
          type: 'worker-error',
          error: {
            message: errorMessage,
            stack: errorStack,
            type: 'unhandledRejection',
            timestamp: Date.now(),
            workerId: parseInt(process.env.WORKER_ID || '0'),
          },
          timestamp: Date.now(),
        });
      }
    });

    // Handle worker-specific signals
    process.on('SIGTERM', () => {
      this.logger.log('Worker received SIGTERM');
      this.cleanup();
      setTimeout(() => process.exit(0), 2000);
    });
  }

  private setupWorkerMemoryMonitoring(): void {
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const usedMB = Math.round(memUsage.heapUsed / 1024 / 1024);

      if (usedMB > this.config.memoryThresholdMB) {
        this.logger.warn(`High memory usage detected: ${usedMB}MB`);

        // Request garbage collection if available
        if (global.gc) {
          try {
            global.gc();
            this.logger.debug('Performed GC on worker process');
          } catch (error) {
            // GC not available
          }
        }
      }

      // Request restart if memory is critically high
      if (usedMB > this.config.maxMemoryThresholdMB && process.send) {
        this.logger.error(
          `Critical memory usage: ${usedMB}MB - requesting restart`,
        );
        process.send({
          type: 'restart-request',
          timestamp: Date.now(),
          data: { reason: 'critical-memory', memoryMB: usedMB },
        });
      }
    }, 30000);
  }

  private setupWorkerPerformanceMonitoring(): void {
    const responseTimes: number[] = [];
    let lastRequestCount = 0;
    let lastMetricsTime = Date.now();

    setInterval(() => {
      const now = Date.now();
      const requestDiff = this.requestCount - lastRequestCount;
      const timeDiff = now - lastMetricsTime;
      const requestsPerSecond = Math.round((requestDiff / timeDiff) * 1000);

      // Calculate average response time
      const avgResponseTime =
        responseTimes.length > 0
          ? responseTimes.reduce((sum, time) => sum + time, 0) /
            responseTimes.length
          : 0;

      // Calculate load factor (0-1 scale)
      const memUsage = process.memoryUsage();
      const memoryLoad = memUsage.heapUsed / (memUsage.heapTotal || 1);
      const cpuLoad = process.cpuUsage();
      const totalCpu = cpuLoad.user + cpuLoad.system;
      const load = Math.min(
        1,
        Math.max(memoryLoad, Math.min(totalCpu / 1000000, 1)),
      );

      if (process.send) {
        process.send({
          type: 'performance-metrics',
          data: {
            avgResponseTime,
            requestsPerSecond,
            load,
            activeConnections: this.requestCount - lastRequestCount,
            lastRequestTime: now,
          },
          timestamp: now,
        });
      }

      // Reset counters
      lastRequestCount = this.requestCount;
      lastMetricsTime = now;
      responseTimes.length = 0; // Clear response times array
    }, this.config.performanceMonitoringInterval);

    // Store response time tracking function for use in request counter
    (this as any).trackResponseTime = (responseTime: number) => {
      responseTimes.push(responseTime);
      if (responseTimes.length > 100) {
        responseTimes.shift(); // Keep only last 100 samples
      }
    };
  }

  private startWorkerStatsReporting(): void {
    this.workerStatsInterval = setInterval(() => {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      const stats: WorkerStats = {
        pid: process.pid,
        memory: memUsage,
        uptime: process.uptime(),
        cpuUsage,
        requestCount: this.requestCount,
        errorCount: this.errorCount,
        lastHeartbeat: Date.now(),
        status: 'healthy',
        memoryUsageMB: Math.round(memUsage.heapUsed / 1024 / 1024),
        avgResponseTime: 0, // Will be updated by performance monitoring
        load: Math.min(1, memUsage.heapUsed / (memUsage.heapTotal || 1)),
        startTime: parseInt(
          process.env.WORKER_START_TIME || Date.now().toString(),
        ),
        restartCount: parseInt(process.env.WORKER_RESTART_COUNT || '0'),
        lastRequestTime: Date.now(),
        version: process.env.WORKER_VERSION || '1.0.0',
      };

      if (process.send) {
        process.send({
          type: 'worker-stats',
          data: stats,
          timestamp: Date.now(),
        });
      }
    }, 60000); // Report every minute
  }

  private setupRequestCounter(
    app: NestExpressApplication,
    onRequestStart: () => void,
    onRequestEnd: () => void,
  ): void {
    try {
      const instance = app.getHttpAdapter().getInstance();

      if (typeof instance.use === 'function') {
        instance.use((req: any, res: any, next: any) => {
          this.requestCount++;
          onRequestStart();

          const startTime = performance.now();

          const onFinish = () => {
            const duration = performance.now() - startTime;
            onRequestEnd();

            // Track response time if monitoring is available
            if (typeof (this as any).trackResponseTime === 'function') {
              (this as any).trackResponseTime(duration);
            }

            if (res.statusCode >= 400) {
              this.errorCount++;
            }

            // Log slow requests
            if (duration > 5000) {
              this.logger.warn(
                `Slow request: ${req.method} ${req.url} - ${duration.toFixed(0)}ms (Status: ${res.statusCode})`,
              );
            }

            // Clean up listeners
            res.removeListener('finish', onFinish);
            res.removeListener('close', onFinish);
          };

          res.on('finish', onFinish);
          res.on('close', onFinish);
          next();
        });

        this.logger.log('Enhanced request counter middleware installed');
      }
    } catch (error) {
      this.logger.error('Failed to setup request counter:', error);
    }
  }

  // Enhanced health status with more detailed metrics
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
    workers: {
      total: number;
      healthy: number;
      unhealthy: number;
      restarting: number;
      draining: number;
      required: number;
    };
    uptime: number;
    requests: number;
    errors: number;
    errorRate: number;
    memory: number;
    performance: {
      avgResponseTime: number;
      p95ResponseTime: number;
      requestsPerSecond: number;
    };
    loadBalancer: {
      algorithm: string;
      requestDistribution: Record<number, number>;
    };
    restarts: {
      recent: number;
      total: number;
    };
  }> {
    const stats = await this.getStats();
    const workerStatsArray = Object.values(stats.workers);

    const healthyWorkers = workerStatsArray.filter(
      (w) => w.status === 'healthy',
    ).length;
    const unhealthyWorkers = workerStatsArray.filter(
      (w) => w.status === 'unhealthy',
    ).length;
    const restartingWorkers = workerStatsArray.filter(
      (w) => w.status === 'restarting',
    ).length;
    const drainingWorkers = workerStatsArray.filter(
      (w) => w.status === 'draining',
    ).length;
    const totalWorkers = workerStatsArray.length;
    const requiredWorkers = this.getOptimalWorkerCount();

    const errorRate =
      stats.totalRequests > 0
        ? (stats.totalErrors / stats.totalRequests) * 100
        : 0;

    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' | 'critical' =
      stats.clusterHealth;

    // Recent restarts (last hour)
    const recentRestarts = this.clusterRestarts.filter(
      (record) => Date.now() - record.timestamp < 3600000,
    ).length;

    return {
      status: overallStatus,
      workers: {
        total: totalWorkers,
        healthy: healthyWorkers,
        unhealthy: unhealthyWorkers,
        restarting: restartingWorkers,
        draining: drainingWorkers,
        required: requiredWorkers,
      },
      uptime: stats.uptime,
      requests: stats.totalRequests,
      errors: stats.totalErrors,
      errorRate: Math.round(errorRate * 100) / 100,
      memory: Math.round(stats.memoryUsage.heapUsed / 1024 / 1024),
      performance: stats.performanceMetrics,
      loadBalancer: {
        algorithm: stats.loadBalancerStats.algorithm,
        requestDistribution: stats.loadBalancerStats.requestDistribution,
      },
      restarts: {
        recent: recentRestarts,
        total: this.clusterRestarts.length,
      },
    };
  }

  // Additional utility methods for advanced cluster management

  async scaleToWorkers(targetCount: number): Promise<void> {
    if (!this.isPrimary()) {
      throw new Error('Scaling can only be performed from primary process');
    }

    const currentCount = Array.from(this.workers.values()).filter(
      (w) => !w.isDead(),
    ).length;

    if (targetCount > currentCount) {
      // Scale up
      const needed = targetCount - currentCount;
      this.logger.log(`Scaling up: creating ${needed} additional workers`);

      for (let i = 0; i < needed; i++) {
        setTimeout(() => this.createWorker(), i * 1000);
      }
    } else if (targetCount < currentCount) {
      // Scale down
      const excess = currentCount - targetCount;
      this.logger.log(`Scaling down: removing ${excess} workers`);

      const workers = Array.from(this.workers.values())
        .filter((w) => !w.isDead())
        .slice(0, excess);

      for (const worker of workers) {
        await this.restartWorkerGracefully(worker, 'scale down');
      }
    }
  }

  async restartAllWorkers(reason: string = 'manual restart'): Promise<void> {
    if (!this.isPrimary()) {
      throw new Error(
        'Cluster restart can only be performed from primary process',
      );
    }

    this.logger.log(`Initiating rolling restart of all workers: ${reason}`);

    const workers = Array.from(this.workers.values()).filter(
      (w) => !w.isDead(),
    );

    // Restart workers one by one to maintain availability
    for (const worker of workers) {
      await this.restartWorkerGracefully(worker, reason);

      // Wait a bit between restarts
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    this.logger.log('Rolling restart completed');
  }

  getWorkerById(workerId: number): Worker | null {
    return this.workers.get(workerId) || null;
  }

  getLoadBalancerStats(): Record<string, any> {
    return this.loadBalancer.getStats();
  }

  // Method to update load balancer algorithm dynamically
  updateLoadBalanceAlgorithm(
    algorithm: 'round-robin' | 'least-connections' | 'weighted-round-robin',
  ): void {
    if (!this.isPrimary()) {
      throw new Error(
        'Load balancer configuration can only be changed from primary process',
      );
    }

    this.logger.log(`Switching load balancer algorithm to: ${algorithm}`);

    // This would require recreating the load balancer with current workers
    // Implementation would depend on requirements for maintaining state
  }
}
