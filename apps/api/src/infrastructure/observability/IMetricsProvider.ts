export interface MetricTags {
  [key: string]: string;
}

export interface IMetricsProvider {
  // Counter metrics
  increment(name: string, value?: number, tags?: MetricTags): void;

  // Gauge metrics
  gauge(name: string, value: number, tags?: MetricTags): void;

  // Histogram metrics
  histogram(name: string, value: number, tags?: MetricTags): void;

  // Timing metrics
  timing(name: string, duration: number, tags?: MetricTags): void;

  // Helper to measure async function execution time
  measureTime<T>(name: string, fn: () => Promise<T>, tags?: MetricTags): Promise<T>;
}