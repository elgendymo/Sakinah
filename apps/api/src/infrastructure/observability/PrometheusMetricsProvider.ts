import { IMetricsProvider, MetricTags } from './IMetricsProvider';
import { logger } from '../../shared/logger';

// Prometheus client will be optional
let promClient: any;
try {
  promClient = require('prom-client');
} catch (e) {
  logger.debug('Prometheus client not available');
}

export class PrometheusMetricsProvider implements IMetricsProvider {
  private counters: Map<string, any> = new Map();
  private gauges: Map<string, any> = new Map();
  private histograms: Map<string, any> = new Map();
  private register: any;

  constructor() {
    if (!promClient) {
      logger.warn('Prometheus client not available, metrics will be logged only');
      return;
    }

    this.register = new promClient.Registry();

    // Add default metrics
    promClient.collectDefaultMetrics({ register: this.register });

    // Initialize custom metrics
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    if (!promClient) return;

    // API metrics
    this.createCounter('api_requests_total', 'Total API requests', ['method', 'route', 'status']);
    this.createHistogram('api_request_duration_seconds', 'API request duration', ['method', 'route']);

    // Business metrics
    this.createCounter('habits_completed_total', 'Total habits completed', ['user_id']);
    this.createCounter('habits_streak_broken_total', 'Total habit streaks broken', ['user_id']);
    this.createGauge('habits_active_count', 'Current active habits count', ['user_id']);
    this.createHistogram('habit_streak_length', 'Distribution of habit streak lengths', ['habit_type']);

    // Cache metrics
    this.createCounter('cache_hits_total', 'Total cache hits', ['cache_key_prefix']);
    this.createCounter('cache_misses_total', 'Total cache misses', ['cache_key_prefix']);
    this.createGauge('cache_size_bytes', 'Current cache size in bytes');

    // Database metrics
    this.createHistogram('database_query_duration_seconds', 'Database query duration', ['operation']);
    this.createCounter('database_errors_total', 'Total database errors', ['operation']);
  }

  private createCounter(name: string, help: string, labelNames: string[] = []): void {
    if (!promClient) return;

    const counter = new promClient.Counter({
      name,
      help,
      labelNames,
      registers: [this.register]
    });
    this.counters.set(name, counter);
  }

  private createGauge(name: string, help: string, labelNames: string[] = []): void {
    if (!promClient) return;

    const gauge = new promClient.Gauge({
      name,
      help,
      labelNames,
      registers: [this.register]
    });
    this.gauges.set(name, gauge);
  }

  private createHistogram(name: string, help: string, labelNames: string[] = []): void {
    if (!promClient) return;

    const histogram = new promClient.Histogram({
      name,
      help,
      labelNames,
      registers: [this.register]
    });
    this.histograms.set(name, histogram);
  }

  increment(name: string, value: number = 1, tags?: MetricTags): void {
    if (!promClient) {
      logger.debug('Metric increment', { name, value, tags });
      return;
    }

    let counter = this.counters.get(name);
    if (!counter) {
      this.createCounter(name, `Counter for ${name}`, tags ? Object.keys(tags) : []);
      counter = this.counters.get(name);
    }

    if (tags) {
      counter.inc(tags, value);
    } else {
      counter.inc(value);
    }
  }

  gauge(name: string, value: number, tags?: MetricTags): void {
    if (!promClient) {
      logger.debug('Metric gauge', { name, value, tags });
      return;
    }

    let gauge = this.gauges.get(name);
    if (!gauge) {
      this.createGauge(name, `Gauge for ${name}`, tags ? Object.keys(tags) : []);
      gauge = this.gauges.get(name);
    }

    if (tags) {
      gauge.set(tags, value);
    } else {
      gauge.set(value);
    }
  }

  histogram(name: string, value: number, tags?: MetricTags): void {
    if (!promClient) {
      logger.debug('Metric histogram', { name, value, tags });
      return;
    }

    let histogram = this.histograms.get(name);
    if (!histogram) {
      this.createHistogram(name, `Histogram for ${name}`, tags ? Object.keys(tags) : []);
      histogram = this.histograms.get(name);
    }

    if (tags) {
      histogram.observe(tags, value);
    } else {
      histogram.observe(value);
    }
  }

  timing(name: string, duration: number, tags?: MetricTags): void {
    this.histogram(name, duration / 1000, tags); // Convert to seconds
  }

  async measureTime<T>(name: string, fn: () => Promise<T>, tags?: MetricTags): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.timing(name, duration, tags);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.timing(name, duration, { ...tags, status: 'error' });
      throw error;
    }
  }

  getMetrics(): Promise<string> {
    if (!promClient) {
      return Promise.resolve('');
    }
    return this.register.metrics();
  }

  getContentType(): string {
    if (!promClient) {
      return 'text/plain';
    }
    return this.register.contentType;
  }
}