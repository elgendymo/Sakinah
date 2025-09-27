import { ErrorCode, ErrorSeverity, ERROR_METADATA } from '../constants/errorCodes';
import { ApiRequestError } from '../net/apiFetch.client';
import { toUIError, UIError } from '../ui/errorUtils';

/**
 * Error Recovery Strategy Interface
 * Defines how different types of errors should be handled and recovered from
 */
export interface ErrorRecoveryStrategy {
  canHandle(error: UIError): boolean;
  handle(error: UIError, context?: ErrorContext): Promise<RecoveryResult>;
}

/**
 * Recovery result from error handling
 */
export interface RecoveryResult {
  success: boolean;
  action: RecoveryAction;
  message?: string;
  retryAfter?: number;
  fallbackData?: unknown;
  requiresUserAction?: boolean;
}

/**
 * Types of recovery actions available
 */
export enum RecoveryAction {
  RETRY = 'RETRY',
  REFRESH_TOKEN = 'REFRESH_TOKEN',
  REDIRECT_LOGIN = 'REDIRECT_LOGIN',
  QUEUE_OFFLINE = 'QUEUE_OFFLINE',
  USE_CACHED_DATA = 'USE_CACHED_DATA',
  SHOW_ERROR = 'SHOW_ERROR',
  FALLBACK = 'FALLBACK',
  IGNORE = 'IGNORE'
}

/**
 * Error context for better error tracking and recovery
 */
export interface ErrorContext {
  operation?: string;
  component?: string;
  userId?: string;
  retryCount?: number;
  originalRequest?: RequestInfo;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Offline request queue item
 */
export interface QueuedRequest {
  id: string;
  request: RequestInfo;
  options: RequestInit;
  timestamp: number;
  retryCount: number;
  context?: ErrorContext;
}

/**
 * Network Error Recovery Strategy
 * Handles network failures with exponential backoff and offline queuing
 */
export class NetworkErrorStrategy implements ErrorRecoveryStrategy {
  private maxRetries = 3;
  private baseDelay = 1000; // 1 second
  private maxDelay = 30000; // 30 seconds

  canHandle(error: UIError): boolean {
    return [
      ErrorCode.NETWORK_ERROR,
      ErrorCode.CONNECTION_FAILED,
      ErrorCode.DNS_ERROR,
      ErrorCode.TIMEOUT_ERROR,
      ErrorCode.REQUEST_TIMEOUT
    ].includes(error.code);
  }

  async handle(error: UIError, context?: ErrorContext): Promise<RecoveryResult> {
    const retryCount = context?.retryCount || 0;

    // Check if we've exceeded retry limit
    if (retryCount >= this.maxRetries) {
      return {
        success: false,
        action: RecoveryAction.QUEUE_OFFLINE,
        message: 'Network unavailable. Request will be retried when connection is restored.',
        requiresUserAction: false
      };
    }

    // Calculate exponential backoff with jitter
    const delay = Math.min(
      this.baseDelay * Math.pow(2, retryCount) + Math.random() * 1000,
      this.maxDelay
    );

    return {
      success: true,
      action: RecoveryAction.RETRY,
      retryAfter: delay,
      message: `Retrying in ${Math.round(delay / 1000)} seconds...`
    };
  }
}

/**
 * Authentication Error Recovery Strategy
 * Handles token expiration, invalid tokens, and session management
 */
export class AuthErrorStrategy implements ErrorRecoveryStrategy {
  private tokenRefreshInProgress = false;
  private refreshPromise: Promise<boolean> | null = null;

  canHandle(error: UIError): boolean {
    return [
      ErrorCode.UNAUTHORIZED,
      ErrorCode.INVALID_TOKEN,
      ErrorCode.SESSION_EXPIRED,
      ErrorCode.FORBIDDEN
    ].includes(error.code);
  }

  async handle(error: UIError, _context?: ErrorContext): Promise<RecoveryResult> {
    switch (error.code) {
      case ErrorCode.UNAUTHORIZED:
      case ErrorCode.INVALID_TOKEN:
      case ErrorCode.SESSION_EXPIRED:
        return this.handleTokenRefresh(_context);

      case ErrorCode.FORBIDDEN:
        return {
          success: false,
          action: RecoveryAction.SHOW_ERROR,
          message: 'You do not have permission to perform this action.',
          requiresUserAction: true
        };

      default:
        return {
          success: false,
          action: RecoveryAction.REDIRECT_LOGIN,
          message: 'Please log in to continue.',
          requiresUserAction: true
        };
    }
  }

  private async handleTokenRefresh(_context?: ErrorContext): Promise<RecoveryResult> {
    // Prevent multiple simultaneous refresh attempts
    if (this.tokenRefreshInProgress) {
      if (this.refreshPromise) {
        const success = await this.refreshPromise;
        return {
          success,
          action: success ? RecoveryAction.RETRY : RecoveryAction.REDIRECT_LOGIN,
          message: success ? 'Authentication refreshed. Retrying...' : 'Please log in again.'
        };
      }
    }

    this.tokenRefreshInProgress = true;
    this.refreshPromise = this.performTokenRefresh();

    try {
      const success = await this.refreshPromise;

      if (success) {
        return {
          success: true,
          action: RecoveryAction.RETRY,
          message: 'Authentication refreshed. Retrying request...'
        };
      } else {
        return {
          success: false,
          action: RecoveryAction.REDIRECT_LOGIN,
          message: 'Session expired. Please log in again.',
          requiresUserAction: true
        };
      }
    } finally {
      this.tokenRefreshInProgress = false;
      this.refreshPromise = null;
    }
  }

  private async performTokenRefresh(): Promise<boolean> {
    try {
      // Import Supabase client dynamically to avoid circular dependencies
      const { createClient } = await import('../supabase-browser');
      const supabase = createClient();

      const { data, error } = await supabase.auth.refreshSession();

      if (error || !data.session) {
        console.warn('Token refresh failed:', error?.message);
        return false;
      }

      console.log('Token refreshed successfully');
      return true;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  }
}

/**
 * Rate Limit Error Recovery Strategy
 * Handles rate limiting with appropriate backoff
 */
export class RateLimitErrorStrategy implements ErrorRecoveryStrategy {
  canHandle(error: UIError): boolean {
    return [
      ErrorCode.RATE_LIMITED,
      ErrorCode.TOO_MANY_ATTEMPTS,
      ErrorCode.API_QUOTA_EXCEEDED
    ].includes(error.code);
  }

  async handle(error: UIError, context?: ErrorContext): Promise<RecoveryResult> {
    // Extract retry-after header if available
    const retryAfter = this.extractRetryAfter(error) || this.calculateBackoff(context?.retryCount || 0);

    return {
      success: true,
      action: RecoveryAction.RETRY,
      retryAfter,
      message: `Rate limit exceeded. Retrying in ${Math.round(retryAfter / 1000)} seconds.`,
      requiresUserAction: false
    };
  }

  private extractRetryAfter(error: UIError): number | null {
    // Try to extract from error message or headers
    if (error.message.includes('retry-after')) {
      const match = error.message.match(/retry-after:\s*(\d+)/i);
      if (match) {
        return parseInt(match[1]) * 1000; // Convert to milliseconds
      }
    }
    return null;
  }

  private calculateBackoff(retryCount: number): number {
    // Progressive backoff: 30s, 60s, 120s, 300s (5 min)
    const delays = [30000, 60000, 120000, 300000];
    return delays[Math.min(retryCount, delays.length - 1)];
  }
}

/**
 * Validation Error Recovery Strategy
 * Handles input validation and user-correctable errors
 */
export class ValidationErrorStrategy implements ErrorRecoveryStrategy {
  canHandle(error: UIError): boolean {
    return [
      ErrorCode.INVALID_INPUT,
      ErrorCode.INVALID_EMAIL,
      ErrorCode.INVALID_PHONE,
      ErrorCode.REQUIRED_FIELD,
      ErrorCode.INVALID_FORMAT,
      ErrorCode.BAD_REQUEST
    ].includes(error.code);
  }

  async handle(error: UIError, _context?: ErrorContext): Promise<RecoveryResult> {
    return {
      success: false,
      action: RecoveryAction.SHOW_ERROR,
      message: error.userMessage,
      requiresUserAction: true
    };
  }
}

/**
 * Server Error Recovery Strategy
 * Handles server-side errors with fallback mechanisms
 */
export class ServerErrorStrategy implements ErrorRecoveryStrategy {
  canHandle(error: UIError): boolean {
    return [
      ErrorCode.SERVER_ERROR,
      ErrorCode.DATABASE_ERROR,
      ErrorCode.EXTERNAL_SERVICE_ERROR,
      ErrorCode.SERVICE_UNAVAILABLE
    ].includes(error.code);
  }

  async handle(error: UIError, context?: ErrorContext): Promise<RecoveryResult> {
    const retryCount = context?.retryCount || 0;

    // Only retry server errors a limited number of times
    if (retryCount < 2) {
      const delay = 2000 * (retryCount + 1); // 2s, 4s

      return {
        success: true,
        action: RecoveryAction.RETRY,
        retryAfter: delay,
        message: 'Server temporarily unavailable. Retrying...'
      };
    }

    // Check if we can use cached data as fallback
    const hasCachedData = await this.checkCachedData(context);

    if (hasCachedData) {
      return {
        success: true,
        action: RecoveryAction.USE_CACHED_DATA,
        message: 'Using offline data while server is unavailable.',
        fallbackData: await this.getCachedData(context)
      };
    }

    return {
      success: false,
      action: RecoveryAction.SHOW_ERROR,
      message: 'Server is temporarily unavailable. Please try again later.',
      requiresUserAction: false
    };
  }

  private async checkCachedData(_context?: ErrorContext): Promise<boolean> {
    // This would integrate with the caching service
    // For now, return false until caching service is implemented
    return false;
  }

  private async getCachedData(_context?: ErrorContext): Promise<unknown> {
    // This would retrieve cached data
    // For now, return null until caching service is implemented
    return null;
  }
}

/**
 * Main Error Service
 * Orchestrates error handling and recovery across the application
 */
export class ErrorService {
  private strategies: ErrorRecoveryStrategy[] = [];
  private offlineQueue: QueuedRequest[] = [];
  private isOnline = navigator.onLine;
  private listeners: Set<(error: UIError, context?: ErrorContext) => void> = new Set();

  constructor() {
    this.initializeStrategies();
    this.setupOnlineStatusMonitoring();
    this.loadOfflineQueue();
  }

  private initializeStrategies() {
    this.strategies = [
      new NetworkErrorStrategy(),
      new AuthErrorStrategy(),
      new RateLimitErrorStrategy(),
      new ValidationErrorStrategy(),
      new ServerErrorStrategy()
    ];
  }

  private setupOnlineStatusMonitoring() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.processOfflineQueue();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  /**
   * Main error handling entry point
   */
  async handleError(error: unknown, context?: ErrorContext): Promise<RecoveryResult> {
    const uiError = toUIError(error);

    // Notify listeners
    this.notifyListeners(uiError, context);

    // Find appropriate strategy
    const strategy = this.findStrategy(uiError);

    if (strategy) {
      return strategy.handle(uiError, context);
    }

    // Default fallback handling
    return this.handleUnknownError(uiError, context);
  }

  /**
   * Add error listener for monitoring/logging
   */
  addErrorListener(listener: (error: UIError, context?: ErrorContext) => void) {
    this.listeners.add(listener);
  }

  /**
   * Remove error listener
   */
  removeErrorListener(listener: (error: UIError, context?: ErrorContext) => void) {
    this.listeners.delete(listener);
  }

  /**
   * Queue request for offline processing
   */
  queueOfflineRequest(request: RequestInfo, options: RequestInit, context?: ErrorContext): string {
    const queueItem: QueuedRequest = {
      id: this.generateRequestId(),
      request,
      options,
      timestamp: Date.now(),
      retryCount: 0,
      context
    };

    this.offlineQueue.push(queueItem);
    this.persistOfflineQueue(); // Persist to localStorage

    return queueItem.id;
  }

  /**
   * Get offline queue status
   */
  getOfflineQueueStatus(): { count: number; oldestRequest?: number } {
    const count = this.offlineQueue.length;
    const oldestRequest = count > 0 ?
      Math.min(...this.offlineQueue.map(item => item.timestamp)) :
      undefined;

    return { count, oldestRequest };
  }

  /**
   * Clear offline queue (for testing or manual intervention)
   */
  clearOfflineQueue(): void {
    this.offlineQueue = [];
    this.persistOfflineQueue();
  }

  private findStrategy(error: UIError): ErrorRecoveryStrategy | null {
    return this.strategies.find(strategy => strategy.canHandle(error)) || null;
  }

  private async handleUnknownError(error: UIError, context?: ErrorContext): Promise<RecoveryResult> {
    // Log unknown error for investigation
    console.error('Unknown error type:', error, context);

    return {
      success: false,
      action: RecoveryAction.SHOW_ERROR,
      message: 'An unexpected error occurred. Please try again.',
      requiresUserAction: false
    };
  }

  private notifyListeners(error: UIError, context?: ErrorContext) {
    this.listeners.forEach(listener => {
      try {
        listener(error, context);
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError);
      }
    });
  }

  private async processOfflineQueue() {
    if (!this.isOnline || this.offlineQueue.length === 0) {
      return;
    }

    console.log(`Processing ${this.offlineQueue.length} queued requests...`);

    // Process requests in order, with retry logic
    const processedItems: string[] = [];

    for (const item of this.offlineQueue) {
      try {
        const response = await fetch(item.request, item.options);

        if (response.ok) {
          processedItems.push(item.id);
          console.log(`Successfully processed queued request: ${item.id}`);
        } else {
          item.retryCount++;

          // Remove items that have failed too many times
          if (item.retryCount >= 3) {
            processedItems.push(item.id);
            console.warn(`Removing failed queued request after 3 attempts: ${item.id}`);
          }
        }
      } catch (error) {
        item.retryCount++;

        if (item.retryCount >= 3) {
          processedItems.push(item.id);
          console.warn(`Removing failed queued request: ${item.id}`, error);
        }
      }
    }

    // Remove processed items
    this.offlineQueue = this.offlineQueue.filter(item => !processedItems.includes(item.id));
    this.persistOfflineQueue();

    if (processedItems.length > 0) {
      console.log(`Processed ${processedItems.length} queued requests`);
    }
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private persistOfflineQueue() {
    try {
      localStorage.setItem('sakinah_offline_queue', JSON.stringify(this.offlineQueue));
    } catch (error) {
      console.warn('Failed to persist offline queue:', error);
    }
  }

  private loadOfflineQueue() {
    try {
      const stored = localStorage.getItem('sakinah_offline_queue');
      if (stored) {
        this.offlineQueue = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load offline queue:', error);
      this.offlineQueue = [];
    }
  }
}

// Global error service instance
export const errorService = new ErrorService();

// Hook for React components to use error service
export function useErrorService() {
  return errorService;
}