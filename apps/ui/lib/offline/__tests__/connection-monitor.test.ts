/**
 * Unit tests for connection monitoring
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ConnectionMonitor, ConnectionStatus, NetworkEvent } from '../connection-monitor';

// Mock global APIs
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockPerformance = {
  now: vi.fn(() => Date.now())
};
global.performance = mockPerformance as any;

const mockAbortSignal = {
  timeout: vi.fn(() => ({ aborted: false }))
};
global.AbortSignal = mockAbortSignal as any;

// Mock navigator
const mockNavigator = {
  onLine: true,
  connection: {
    type: 'wifi',
    effectiveType: '4g',
    downlink: 10,
    rtt: 100,
    saveData: false,
    addEventListener: vi.fn()
  }
};

Object.defineProperty(global, 'navigator', {
  value: mockNavigator,
  writable: true
});

// Mock window events
const mockWindow = {
  addEventListener: vi.fn(),
  removeEventListener: vi.fn()
};
global.window = mockWindow as any;

// Mock document
const mockDocument = {
  addEventListener: vi.fn(),
  hidden: false
};
global.document = mockDocument as any;

describe('ConnectionMonitor', () => {
  let monitor: ConnectionMonitor;
  let eventListener: vi.MockedFunction<(event: NetworkEvent) => void>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Reset navigator state
    mockNavigator.onLine = true;
    mockDocument.hidden = false;

    monitor = new ConnectionMonitor({
      heartbeatInterval: 1000,
      heartbeatUrl: '/api/health',
      heartbeatTimeout: 500,
      enableHeartbeat: true,
      enableNetworkInformation: true,
      enableVisibilityTracking: true
    });

    eventListener = vi.fn();
    monitor.addEventListener(eventListener);
  });

  afterEach(() => {
    monitor.stop();
    vi.useRealTimers();
  });

  describe('initialization', () => {
    it('should initialize with correct default status', () => {
      const status = monitor.getConnectionStatus();

      expect(status).toMatchObject({
        isOnline: true,
        connectionType: 'wifi',
        effectiveType: '4g',
        downlink: 10,
        rtt: 100,
        saveData: false,
        isStable: true
      });
    });

    it('should setup event listeners correctly', () => {
      expect(mockWindow.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(mockWindow.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
      expect(mockDocument.addEventListener).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
      expect(mockNavigator.connection.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should handle missing Network Information API gracefully', () => {
      const originalConnection = mockNavigator.connection;
      delete (mockNavigator as any).connection;

      const monitorWithoutAPI = new ConnectionMonitor({
        enableNetworkInformation: true
      });

      const status = monitorWithoutAPI.getConnectionStatus();

      expect(status.connectionType).toBe('unknown');
      expect(status.effectiveType).toBe('unknown');

      // Restore connection for other tests
      mockNavigator.connection = originalConnection;
    });
  });

  describe('connection testing', () => {
    it('should detect online status when API call succeeds', async () => {
      const mockResponse = {
        ok: true,
        status: 200
      };
      mockFetch.mockResolvedValue(mockResponse);
      mockPerformance.now.mockReturnValueOnce(0).mockReturnValueOnce(150);

      const status = await monitor.testConnection();

      expect(status.isOnline).toBe(true);
      expect(status.rtt).toBe(150);
      expect(status.lastOnline).toBeInstanceOf(Date);
      expect(mockFetch).toHaveBeenCalledWith('/api/health', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: expect.any(Object)
      });
    });

    it('should detect offline status when API call fails', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const status = await monitor.testConnection();

      expect(status.isOnline).toBe(false);
      expect(status.lastOffline).toBeInstanceOf(Date);
    });

    it('should handle HTTP errors as offline', async () => {
      const mockResponse = {
        ok: false,
        status: 500
      };
      mockFetch.mockResolvedValue(mockResponse);

      const status = await monitor.testConnection();

      expect(status.isOnline).toBe(false);
      expect(status.lastOffline).toBeInstanceOf(Date);
    });

    it('should handle timeout correctly', async () => {
      mockFetch.mockImplementation(() => new Promise(() => {})); // Never resolves

      const testPromise = monitor.testConnection();

      // Fast-forward past the timeout
      vi.advanceTimersByTime(600);

      const status = await testPromise;

      expect(status.isOnline).toBe(false);
    });
  });

  describe('heartbeat monitoring', () => {
    it('should perform heartbeat at specified intervals', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200 });

      monitor.start();

      // Fast-forward to trigger heartbeat
      vi.advanceTimersByTime(1100); // Initial delay + interval

      await vi.runAllTimersAsync();

      expect(mockFetch).toHaveBeenCalledWith('/api/health', expect.any(Object));
    });

    it('should not perform heartbeat when page is hidden and recently successful', async () => {
      mockDocument.hidden = true;
      mockFetch.mockResolvedValue({ ok: true, status: 200 });

      monitor.start();

      // Simulate recent successful heartbeat
      monitor['lastHeartbeatSuccess'] = Date.now();

      vi.advanceTimersByTime(1100);
      await vi.runAllTimersAsync();

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should perform heartbeat when page is hidden but no recent success', async () => {
      mockDocument.hidden = true;
      mockFetch.mockResolvedValue({ ok: true, status: 200 });

      monitor.start();

      // Simulate old last success
      monitor['lastHeartbeatSuccess'] = Date.now() - 10000;

      vi.advanceTimersByTime(1100);
      await vi.runAllTimersAsync();

      expect(mockFetch).toHaveBeenCalled();
    });

    it('should stop heartbeat when monitor is stopped', () => {
      monitor.start();
      monitor.stop();

      vi.advanceTimersByTime(1100);

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('event emission', () => {
    it('should emit online event when going online', async () => {
      // Start offline
      mockNavigator.onLine = false;
      const offlineMonitor = new ConnectionMonitor();
      offlineMonitor.addEventListener(eventListener);

      // Simulate going online
      mockFetch.mockResolvedValue({ ok: true, status: 200 });
      await offlineMonitor.testConnection();

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'online',
          currentStatus: expect.objectContaining({
            isOnline: true
          })
        })
      );
    });

    it('should emit offline event when going offline', async () => {
      // Start online, then fail connection test
      mockFetch.mockRejectedValue(new Error('Network error'));
      await monitor.testConnection();

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'offline',
          currentStatus: expect.objectContaining({
            isOnline: false
          })
        })
      );
    });

    it('should emit quality-change event when connection quality changes', () => {
      // Simulate connection quality change
      const newStatus = {
        isOnline: true,
        connectionType: 'cellular' as const,
        effectiveType: '2g' as const,
        downlink: 0.5,
        rtt: 2000,
        saveData: true,
        lastOnline: new Date(),
        lastOffline: null,
        connectionQuality: 'poor' as const,
        isStable: true
      };

      monitor['updateStatus'](newStatus, 'navigator');

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'quality-change',
          currentStatus: expect.objectContaining({
            connectionQuality: 'poor'
          })
        })
      );
    });

    it('should emit instability-detected event when connection becomes unstable', () => {
      // Add multiple disconnection events
      const now = Date.now();
      monitor['stabilityHistory'] = [
        { timestamp: now - 60000, online: false },
        { timestamp: now - 50000, online: true },
        { timestamp: now - 40000, online: false },
        { timestamp: now - 30000, online: true },
        { timestamp: now - 20000, online: false },
        { timestamp: now - 10000, online: true }
      ];

      // This should trigger instability detection
      monitor['updateStatus']({ isOnline: false }, 'heartbeat');

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'instability-detected'
        })
      );
    });
  });

  describe('stability metrics', () => {
    it('should calculate stability metrics correctly', () => {
      const now = Date.now();
      monitor['stabilityHistory'] = [
        { timestamp: now - 100000, online: true },
        { timestamp: now - 80000, online: false }, // Disconnection 1
        { timestamp: now - 70000, online: true },  // Reconnect after 10s
        { timestamp: now - 50000, online: false }, // Disconnection 2
        { timestamp: now - 40000, online: true },  // Reconnect after 10s
        { timestamp: now - 10000, online: true }
      ];

      monitor['currentStatus'].isOnline = true;

      const metrics = monitor.getStabilityMetrics();

      expect(metrics.disconnectionCount).toBe(2);
      expect(metrics.averageReconnectTime).toBe(10000); // Average of 10s + 10s
      expect(metrics.uptime).toBeGreaterThan(80); // Should be high since disconnections were brief
      expect(metrics.isStable).toBe(true); // ≤2 disconnections and high uptime
    });

    it('should detect unstable connection', () => {
      const now = Date.now();
      // Simulate many disconnections
      monitor['stabilityHistory'] = [
        { timestamp: now - 100000, online: true },
        { timestamp: now - 90000, online: false },
        { timestamp: now - 80000, online: true },
        { timestamp: now - 70000, online: false },
        { timestamp: now - 60000, online: true },
        { timestamp: now - 50000, online: false },
        { timestamp: now - 40000, online: true }
      ];

      const metrics = monitor.getStabilityMetrics();

      expect(metrics.disconnectionCount).toBe(3);
      expect(metrics.isStable).toBe(false); // >2 disconnections
    });

    it('should handle empty history gracefully', () => {
      monitor['stabilityHistory'] = [];
      monitor['currentStatus'].isOnline = true;

      const metrics = monitor.getStabilityMetrics();

      expect(metrics).toMatchObject({
        isStable: true,
        uptime: 100,
        disconnectionCount: 0,
        averageReconnectTime: 0
      });
    });
  });

  describe('connection quality calculation', () => {
    it('should calculate excellent quality for fast connections', () => {
      const status: ConnectionStatus = {
        isOnline: true,
        rtt: 50,
        downlink: 20,
        connectionType: 'wifi',
        effectiveType: '4g',
        saveData: false,
        lastOnline: null,
        lastOffline: null,
        connectionQuality: 'offline',
        isStable: true
      };

      const quality = monitor['calculateConnectionQuality'](status);
      expect(quality).toBe('excellent');
    });

    it('should calculate poor quality for slow connections', () => {
      const status: ConnectionStatus = {
        isOnline: true,
        rtt: 2000,
        downlink: 0.1,
        connectionType: 'cellular',
        effectiveType: '2g',
        saveData: true,
        lastOnline: null,
        lastOffline: null,
        connectionQuality: 'offline',
        isStable: true
      };

      const quality = monitor['calculateConnectionQuality'](status);
      expect(quality).toBe('poor');
    });

    it('should return offline for disconnected state', () => {
      const status: ConnectionStatus = {
        isOnline: false,
        rtt: 0,
        downlink: 0,
        connectionType: 'unknown',
        effectiveType: 'unknown',
        saveData: false,
        lastOnline: null,
        lastOffline: new Date(),
        connectionQuality: 'offline',
        isStable: true
      };

      const quality = monitor['calculateConnectionQuality'](status);
      expect(quality).toBe('offline');
    });
  });

  describe('manual override', () => {
    it('should allow forcing online status', () => {
      monitor.forceOnline();

      const status = monitor.getConnectionStatus();
      expect(status.isOnline).toBe(true);
      expect(status.lastOnline).toBeInstanceOf(Date);

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'online',
          metadata: expect.objectContaining({
            triggeredBy: 'manual'
          })
        })
      );
    });

    it('should allow forcing offline status', () => {
      monitor.forceOffline();

      const status = monitor.getConnectionStatus();
      expect(status.isOnline).toBe(false);
      expect(status.lastOffline).toBeInstanceOf(Date);

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'offline',
          metadata: expect.objectContaining({
            triggeredBy: 'manual'
          })
        })
      );
    });
  });

  describe('event listener management', () => {
    it('should add and remove event listeners correctly', () => {
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      monitor.addEventListener(listener1);
      monitor.addEventListener(listener2);

      // Test that both are added
      expect(monitor['listeners']).toContain(listener1);
      expect(monitor['listeners']).toContain(listener2);

      // Remove one listener
      monitor.removeEventListener(listener1);

      expect(monitor['listeners']).not.toContain(listener1);
      expect(monitor['listeners']).toContain(listener2);
    });

    it('should handle listener errors gracefully', () => {
      const errorListener = vi.fn().mockImplementation(() => {
        throw new Error('Listener error');
      });

      monitor.addEventListener(errorListener);

      // This should not throw
      expect(() => {
        monitor.forceOnline();
      }).not.toThrow();

      expect(errorListener).toHaveBeenCalled();
    });
  });

  describe('page visibility handling', () => {
    it('should test connection when page becomes visible', async () => {
      mockFetch.mockResolvedValue({ ok: true, status: 200 });

      // Simulate page becoming visible
      mockDocument.hidden = false;
      const visibilityChangeHandler = mockDocument.addEventListener.mock.calls
        .find(call => call[0] === 'visibilitychange')[1];

      visibilityChangeHandler();

      // Wait for the timeout in the visibility handler
      vi.advanceTimersByTime(1100);
      await vi.runAllTimersAsync();

      expect(mockFetch).toHaveBeenCalled();
    });
  });
});