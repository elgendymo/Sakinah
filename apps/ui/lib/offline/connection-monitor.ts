/**
 * Advanced Connection Monitoring and Offline Detection
 *
 * This module provides comprehensive network connectivity monitoring with
 * intelligent detection capabilities beyond basic navigator.onLine.
 */

export interface ConnectionStatus {
  isOnline: boolean;
  connectionType: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
  effectiveType: '2g' | '3g' | '4g' | 'slow-2g' | 'unknown';
  downlink: number; // Mbps
  rtt: number; // Round trip time in ms
  saveData: boolean; // Data saver mode
  lastOnline: Date | null;
  lastOffline: Date | null;
  connectionQuality: 'excellent' | 'good' | 'fair' | 'poor' | 'offline';
  isStable: boolean; // Whether connection has been stable recently
}

export interface NetworkEvent {
  type: 'online' | 'offline' | 'connection-change' | 'quality-change' | 'instability-detected';
  timestamp: Date;
  previousStatus?: ConnectionStatus;
  currentStatus: ConnectionStatus;
  metadata?: {
    triggeredBy?: 'navigator' | 'heartbeat' | 'api-test' | 'manual';
    confidence?: number;
    details?: string;
  };
}

export interface ConnectionMonitorOptions {
  heartbeatInterval?: number; // ms
  heartbeatUrl?: string;
  heartbeatTimeout?: number; // ms
  stabilityWindow?: number; // ms - window to consider for stability
  qualityThresholds?: {
    excellent: { rtt: number; downlink: number };
    good: { rtt: number; downlink: number };
    fair: { rtt: number; downlink: number };
  };
  enableHeartbeat?: boolean;
  enableNetworkInformation?: boolean;
  enableVisibilityTracking?: boolean;
}

/**
 * Advanced connection monitoring with multiple detection methods
 */
export class ConnectionMonitor {
  private options: Required<ConnectionMonitorOptions>;
  private currentStatus: ConnectionStatus;
  private listeners: Array<(event: NetworkEvent) => void> = [];
  private heartbeatInterval?: NodeJS.Timeout;
  private heartbeatController?: AbortController;
  private stabilityHistory: Array<{ timestamp: number; online: boolean }> = [];
  private isVisible = true;
  private reconnectAttempts = 0;
  private lastHeartbeatSuccess = Date.now();

  constructor(options: ConnectionMonitorOptions = {}) {
    this.options = {
      heartbeatInterval: 30000, // 30 seconds
      heartbeatUrl: '/api/health',
      heartbeatTimeout: 5000, // 5 seconds
      stabilityWindow: 120000, // 2 minutes
      qualityThresholds: {
        excellent: { rtt: 100, downlink: 10 },
        good: { rtt: 300, downlink: 2 },
        fair: { rtt: 1000, downlink: 0.5 }
      },
      enableHeartbeat: true,
      enableNetworkInformation: true,
      enableVisibilityTracking: true,
      ...options
    };

    this.currentStatus = this.getInitialStatus();
    this.setupEventListeners();

    if (this.options.enableHeartbeat) {
      this.startHeartbeat();
    }
  }

  /**
   * Get current connection status
   */
  getConnectionStatus(): ConnectionStatus {
    return { ...this.currentStatus };
  }

  /**
   * Test connection quality
   */
  async testConnection(): Promise<ConnectionStatus> {
    if (typeof window === 'undefined') {
      return this.currentStatus;
    }

    const testStart = performance.now();

    try {
      const response = await fetch(this.options.heartbeatUrl, {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(this.options.heartbeatTimeout)
      });

      const testEnd = performance.now();
      const rtt = testEnd - testStart;

      if (response.ok) {
        const updatedStatus = this.updateConnectionMetrics({
          isOnline: true,
          rtt,
          lastOnline: new Date()
        });

        this.reconnectAttempts = 0;
        this.lastHeartbeatSuccess = Date.now();

        return updatedStatus;
      } else {
        throw new Error(`HTTP ${response.status}`);
      }

    } catch (error) {
      const updatedStatus = this.updateConnectionMetrics({
        isOnline: false,
        lastOffline: new Date()
      });

      return updatedStatus;
    }
  }

  /**
   * Force online status (for testing or manual override)
   */
  forceOnline(): void {
    this.updateStatus({
      isOnline: true,
      lastOnline: new Date()
    }, 'manual');
  }

  /**
   * Force offline status (for testing or manual override)
   */
  forceOffline(): void {
    this.updateStatus({
      isOnline: false,
      lastOffline: new Date()
    }, 'manual');
  }

  /**
   * Add event listener
   */
  addEventListener(listener: (event: NetworkEvent) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove event listener
   */
  removeEventListener(listener: (event: NetworkEvent) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Start monitoring
   */
  start(): void {
    if (this.options.enableHeartbeat && !this.heartbeatInterval) {
      this.startHeartbeat();
    }
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }

    if (this.heartbeatController) {
      this.heartbeatController.abort();
      this.heartbeatController = undefined;
    }
  }

  /**
   * Get connection stability over time
   */
  getStabilityMetrics(): {
    isStable: boolean;
    uptime: number; // percentage
    disconnectionCount: number;
    averageReconnectTime: number;
  } {
    const now = Date.now();
    const windowStart = now - this.options.stabilityWindow;

    const recentHistory = this.stabilityHistory.filter(
      entry => entry.timestamp >= windowStart
    );

    if (recentHistory.length === 0) {
      return {
        isStable: this.currentStatus.isOnline,
        uptime: this.currentStatus.isOnline ? 100 : 0,
        disconnectionCount: 0,
        averageReconnectTime: 0
      };
    }

    let disconnectionCount = 0;
    let totalOfflineTime = 0;
    let reconnectTimes: number[] = [];
    let currentOfflineStart: number | null = null;

    for (let i = 0; i < recentHistory.length; i++) {
      const entry = recentHistory[i];

      if (!entry.online && (i === 0 || recentHistory[i - 1].online)) {
        // Going offline
        disconnectionCount++;
        currentOfflineStart = entry.timestamp;
      } else if (entry.online && currentOfflineStart !== null) {
        // Coming back online
        const offlineTime = entry.timestamp - currentOfflineStart;
        totalOfflineTime += offlineTime;
        reconnectTimes.push(offlineTime);
        currentOfflineStart = null;
      }
    }

    // If currently offline, add current offline time
    if (currentOfflineStart !== null && !this.currentStatus.isOnline) {
      totalOfflineTime += now - currentOfflineStart;
    }

    const uptime = Math.max(0, 100 - (totalOfflineTime / this.options.stabilityWindow) * 100);
    const averageReconnectTime = reconnectTimes.length > 0
      ? reconnectTimes.reduce((sum, time) => sum + time, 0) / reconnectTimes.length
      : 0;

    const isStable = disconnectionCount <= 2 && uptime >= 90; // Stable if ≤2 disconnections and ≥90% uptime

    return {
      isStable,
      uptime,
      disconnectionCount,
      averageReconnectTime
    };
  }

  // Private methods

  private getInitialStatus(): ConnectionStatus {
    const baseStatus: ConnectionStatus = {
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      connectionType: 'unknown',
      effectiveType: 'unknown',
      downlink: 0,
      rtt: 0,
      saveData: false,
      lastOnline: null,
      lastOffline: null,
      connectionQuality: 'offline',
      isStable: true
    };

    if (typeof navigator !== 'undefined' && this.options.enableNetworkInformation) {
      const connection = this.getNetworkInformation();
      if (connection) {
        baseStatus.connectionType = (connection.type as any) || 'unknown';
        baseStatus.effectiveType = connection.effectiveType || 'unknown';
        baseStatus.downlink = connection.downlink || 0;
        baseStatus.rtt = connection.rtt || 0;
        baseStatus.saveData = connection.saveData || false;
      }
    }

    baseStatus.connectionQuality = this.calculateConnectionQuality(baseStatus);

    return baseStatus;
  }

  private setupEventListeners(): void {
    if (typeof window === 'undefined') return;

    // Navigator online/offline events
    window.addEventListener('online', () => {
      this.updateStatus({ isOnline: true, lastOnline: new Date() }, 'navigator');
    });

    window.addEventListener('offline', () => {
      this.updateStatus({ isOnline: false, lastOffline: new Date() }, 'navigator');
    });

    // Network Information API changes
    if (this.options.enableNetworkInformation) {
      const connection = this.getNetworkInformation();
      if (connection) {
        connection.addEventListener('change', () => {
          this.handleNetworkInformationChange();
        });
      }
    }

    // Page visibility changes
    if (this.options.enableVisibilityTracking) {
      document.addEventListener('visibilitychange', () => {
        this.isVisible = !document.hidden;

        if (this.isVisible) {
          // Page became visible, test connection
          setTimeout(() => {
            this.testConnection();
          }, 1000);
        }
      });
    }
  }

  private getNetworkInformation(): any {
    return (navigator as any).connection ||
           (navigator as any).mozConnection ||
           (navigator as any).webkitConnection;
  }

  private handleNetworkInformationChange(): void {
    const connection = this.getNetworkInformation();
    if (!connection) return;

    const updates = {
      connectionType: (connection.type as any) || 'unknown',
      effectiveType: connection.effectiveType || 'unknown',
      downlink: connection.downlink || 0,
      rtt: connection.rtt || 0,
      saveData: connection.saveData || false
    };

    this.updateStatus(updates, 'navigator');
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) return;

    this.heartbeatInterval = setInterval(async () => {
      // Skip heartbeat if page is not visible and we haven't been offline for too long
      if (!this.isVisible && this.currentStatus.isOnline &&
          Date.now() - this.lastHeartbeatSuccess < this.options.heartbeatInterval * 3) {
        return;
      }

      await this.performHeartbeat();
    }, this.options.heartbeatInterval);

    // Perform initial heartbeat
    setTimeout(() => this.performHeartbeat(), 1000);
  }

  private async performHeartbeat(): Promise<void> {
    if (this.heartbeatController) {
      this.heartbeatController.abort();
    }

    this.heartbeatController = new AbortController();

    try {
      const status = await this.testConnection();
      this.updateStatus(status, 'heartbeat');

      // If we were in reconnect mode and now online, reset attempts
      if (status.isOnline && this.reconnectAttempts > 0) {
        this.reconnectAttempts = 0;
        this.emit({
          type: 'online',
          timestamp: new Date(),
          currentStatus: status,
          metadata: {
            triggeredBy: 'heartbeat',
            details: 'Reconnected after heartbeat test'
          }
        });
      }

    } catch (error) {
      // Heartbeat failed, but don't immediately mark as offline
      // unless we haven't had a successful heartbeat recently
      const timeSinceLastSuccess = Date.now() - this.lastHeartbeatSuccess;

      if (timeSinceLastSuccess > this.options.heartbeatInterval * 2) {
        this.updateStatus({
          isOnline: false,
          lastOffline: new Date()
        }, 'heartbeat');

        this.reconnectAttempts++;
      }
    } finally {
      this.heartbeatController = undefined;
    }
  }

  private updateConnectionMetrics(updates: Partial<ConnectionStatus>): ConnectionStatus {
    const updatedStatus = {
      ...this.currentStatus,
      ...updates
    };

    updatedStatus.connectionQuality = this.calculateConnectionQuality(updatedStatus);
    updatedStatus.isStable = this.getStabilityMetrics().isStable;

    return updatedStatus;
  }

  private updateStatus(updates: Partial<ConnectionStatus>, triggeredBy: string): void {
    const previousStatus = { ...this.currentStatus };
    const updatedStatus = this.updateConnectionMetrics(updates);

    // Track stability history
    this.stabilityHistory.push({
      timestamp: Date.now(),
      online: updatedStatus.isOnline
    });

    // Limit history size
    const cutoff = Date.now() - this.options.stabilityWindow;
    this.stabilityHistory = this.stabilityHistory.filter(
      entry => entry.timestamp >= cutoff
    );

    // Check for significant changes
    const statusChanged = previousStatus.isOnline !== updatedStatus.isOnline;
    const qualityChanged = previousStatus.connectionQuality !== updatedStatus.connectionQuality;

    this.currentStatus = updatedStatus;

    // Emit appropriate events
    if (statusChanged) {
      this.emit({
        type: updatedStatus.isOnline ? 'online' : 'offline',
        timestamp: new Date(),
        previousStatus,
        currentStatus: updatedStatus,
        metadata: { triggeredBy: triggeredBy as "manual" | "navigator" | "heartbeat" | "api-test" }
      });
    } else if (qualityChanged) {
      this.emit({
        type: 'quality-change',
        timestamp: new Date(),
        previousStatus,
        currentStatus: updatedStatus,
        metadata: { triggeredBy: triggeredBy as "manual" | "navigator" | "heartbeat" | "api-test" }
      });
    }

    // Check for instability
    const stability = this.getStabilityMetrics();
    if (!stability.isStable && previousStatus.isStable) {
      this.emit({
        type: 'instability-detected',
        timestamp: new Date(),
        previousStatus,
        currentStatus: updatedStatus,
        metadata: {
          triggeredBy: triggeredBy as "manual" | "navigator" | "heartbeat" | "api-test",
          details: `${stability.disconnectionCount} disconnections, ${stability.uptime.toFixed(1)}% uptime`
        }
      });
    }
  }

  private calculateConnectionQuality(status: ConnectionStatus): ConnectionStatus['connectionQuality'] {
    if (!status.isOnline) {
      return 'offline';
    }

    const { rtt, downlink } = status;
    const { excellent, good, fair } = this.options.qualityThresholds;

    if (rtt <= excellent.rtt && downlink >= excellent.downlink) {
      return 'excellent';
    } else if (rtt <= good.rtt && downlink >= good.downlink) {
      return 'good';
    } else if (rtt <= fair.rtt && downlink >= fair.downlink) {
      return 'fair';
    } else {
      return 'poor';
    }
  }

  private emit(event: NetworkEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Connection monitor event listener error:', error);
      }
    });
  }
}

/**
 * React hook for connection monitoring
 */
export function useConnectionMonitor(options?: ConnectionMonitorOptions) {
  // Always call hooks at the top level
  const [monitor] = React.useState(() =>
    typeof window === 'undefined' ? null : new ConnectionMonitor(options)
  );
  const [status, setStatus] = React.useState(() =>
    typeof window === 'undefined'
      ? {
          isOnline: true,
          connectionType: 'unknown' as const,
          effectiveType: 'unknown' as const,
          downlink: 0,
          rtt: 0,
          saveData: false,
          lastOnline: null,
          lastOffline: null,
          connectionQuality: 'excellent' as const,
          isStable: true
        }
      : monitor?.getConnectionStatus() || {
          isOnline: true,
          connectionType: 'unknown' as const,
          effectiveType: 'unknown' as const,
          downlink: 0,
          rtt: 0,
          saveData: false,
          lastOnline: null,
          lastOffline: null,
          connectionQuality: 'excellent' as const,
          isStable: true
        }
  );

  React.useEffect(() => {
    if (typeof window === 'undefined' || !monitor) {
      return;
    }
    const handleNetworkEvent = (event: NetworkEvent) => {
      setStatus(event.currentStatus);
    };

    monitor.addEventListener(handleNetworkEvent);
    monitor.start();

    return () => {
      monitor.removeEventListener(handleNetworkEvent);
      monitor.stop();
    };
  }, [monitor]);

  return {
    status,
    testConnection: monitor?.testConnection.bind(monitor) || (async () => ({ isOnline: true }) as any),
    addEventListener: monitor?.addEventListener.bind(monitor) || (() => {}),
    removeEventListener: monitor?.removeEventListener.bind(monitor) || (() => {}),
    getStabilityMetrics: monitor?.getStabilityMetrics.bind(monitor) || (() => ({
      isStable: true,
      uptime: 100,
      disconnectionCount: 0,
      averageReconnectTime: 0
    }))
  };
}

// Global singleton for app-wide usage
export const connectionMonitor = new ConnectionMonitor();

// Auto-start monitoring in browser environment
if (typeof window !== 'undefined') {
  connectionMonitor.start();
}

// Import React for the hook (this should be conditional in a real app)
declare const React: any;