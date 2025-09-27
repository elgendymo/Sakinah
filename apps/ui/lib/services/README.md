# Error Handling and Recovery System

This document describes the comprehensive error handling and recovery system implemented for Task 16 of the frontend-backend alignment project.

## Overview

The error handling system provides:

- **Automatic retry with exponential backoff** for network and server errors
- **Token refresh logic** for authentication errors
- **Offline request queueing** for network failures
- **Multiple recovery strategies** based on error type
- **React hooks** for easy integration
- **Comprehensive unit tests** for reliability

## Architecture

### Core Components

1. **ErrorService** (`ErrorService.ts`)
   - Main orchestrator for error handling
   - Implements strategy pattern for different error types
   - Manages offline request queue
   - Provides error monitoring and logging

2. **EnhancedApiClient** (`EnhancedApiClient.ts`)
   - HTTP client with integrated error handling
   - Request cancellation and timeout support
   - Automatic correlation ID tracking
   - Context-aware error reporting

3. **useEnhancedApi** (`useEnhancedApi.ts`)
   - React hooks for API requests with error handling
   - State management for loading, data, and errors
   - Retry and cancel capabilities
   - Offline queue monitoring

### Error Recovery Strategies

#### 1. NetworkErrorStrategy
- **Handles**: Network errors, connection failures, timeouts
- **Recovery**: Exponential backoff retry (1s, 2s, 4s, max 30s)
- **Fallback**: Queue for offline sync after max retries

#### 2. AuthErrorStrategy
- **Handles**: Authentication errors, token expiration, session issues
- **Recovery**: Automatic token refresh using Supabase
- **Fallback**: Redirect to login page if refresh fails

#### 3. RateLimitErrorStrategy
- **Handles**: Rate limiting, quota exceeded, too many requests
- **Recovery**: Progressive backoff (30s, 60s, 120s, 300s)
- **Feature**: Extracts retry-after headers from responses

#### 4. ValidationErrorStrategy
- **Handles**: Input validation, bad requests, malformed data
- **Recovery**: Display user-friendly error messages
- **Action**: Requires user intervention to fix input

#### 5. ServerErrorStrategy
- **Handles**: Server errors, database issues, service unavailable
- **Recovery**: Limited retries with progressive delay
- **Fallback**: Use cached data if available

## Usage Examples

### Basic API Request with Error Handling

```typescript
import { useEnhancedGet } from '@/lib/hooks/useEnhancedApi';

function UserList() {
  const { state, retry, isRetryable } = useEnhancedGet('/api/users', {
    immediate: true,
    context: {
      component: 'UserList',
      operation: 'fetchUsers'
    },
    onError: (error) => {
      console.error('Failed to load users:', error.message);
    }
  });

  if (state.loading) return <div>Loading...</div>;
  if (state.error) {
    return (
      <div>
        <p>Error: {state.error.userMessage}</p>
        {isRetryable && (
          <button onClick={retry}>Retry</button>
        )}
      </div>
    );
  }

  return <div>{/* Render users */}</div>;
}
```

### POST Request with Error Handling

```typescript
import { useEnhancedPost } from '@/lib/hooks/useEnhancedApi';

function CreateUser() {
  const { post, state, retry, reset } = useEnhancedPost('/api/users', {
    context: {
      component: 'CreateUser',
      operation: 'createUser'
    },
    onSuccess: (user) => {
      console.log('User created:', user);
    },
    onError: (error) => {
      console.error('Failed to create user:', error);
    }
  });

  const handleSubmit = async (userData) => {
    try {
      await post(userData);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      {state.error && (
        <div>
          <p>{state.error.userMessage}</p>
          <button onClick={retry}>Retry</button>
          <button onClick={reset}>Reset</button>
        </div>
      )}
    </form>
  );
}
```

### Offline Queue Monitoring

```typescript
import { useOfflineQueue } from '@/lib/hooks/useEnhancedApi';

function OfflineStatus() {
  const { queueStatus, clearQueue, isOnline } = useOfflineQueue();

  return (
    <div>
      <p>Status: {isOnline ? 'Online' : 'Offline'}</p>
      {queueStatus.count > 0 && (
        <div>
          <p>{queueStatus.count} requests queued</p>
          <button onClick={clearQueue}>Clear Queue</button>
        </div>
      )}
    </div>
  );
}
```

### Direct Error Service Usage

```typescript
import { errorService } from '@/lib/services/ErrorService';

// Add error listener for monitoring
errorService.addErrorListener((error, context) => {
  // Send to analytics service
  analytics.track('api_error', {
    errorCode: error.code,
    component: context?.component,
    operation: context?.operation
  });
});

// Manual error handling
try {
  const result = await apiCall();
} catch (error) {
  const recovery = await errorService.handleError(error, {
    component: 'MyComponent',
    operation: 'fetchData'
  });

  switch (recovery.action) {
    case 'RETRY':
      // Retry the operation
      break;
    case 'USE_CACHED_DATA':
      // Use fallback data
      break;
    default:
      // Show error to user
      break;
  }
}
```

## Configuration

### Error Service Configuration

The ErrorService can be configured with custom strategies:

```typescript
import { ErrorService, NetworkErrorStrategy } from '@/lib/services/ErrorService';

// Custom network strategy with different retry logic
class CustomNetworkStrategy extends NetworkErrorStrategy {
  private maxRetries = 5; // Override default
  private baseDelay = 2000; // 2 seconds base delay
}

const customErrorService = new ErrorService();
// Add custom strategies as needed
```

### API Client Configuration

```typescript
import { EnhancedApiClient } from '@/lib/services/EnhancedApiClient';

const apiClient = new EnhancedApiClient('https://api.example.com', {
  'X-App-Version': '1.0.0',
  'X-Client': 'web'
});

// Make request with custom options
const result = await apiClient.get('/users', {
  timeout: 10000,
  maxRetries: 5,
  useErrorService: true,
  offlineQueueable: true,
  context: {
    component: 'UserList',
    operation: 'fetchUsers'
  }
});
```

## Error Types and Codes

The system uses a comprehensive error classification system:

- **Authentication Errors**: `UNAUTHORIZED`, `INVALID_TOKEN`, `SESSION_EXPIRED`
- **Network Errors**: `NETWORK_ERROR`, `CONNECTION_FAILED`, `TIMEOUT_ERROR`
- **Validation Errors**: `INVALID_INPUT`, `REQUIRED_FIELD`, `INVALID_FORMAT`
- **Server Errors**: `SERVER_ERROR`, `DATABASE_ERROR`, `SERVICE_UNAVAILABLE`
- **Rate Limiting**: `RATE_LIMITED`, `TOO_MANY_ATTEMPTS`, `API_QUOTA_EXCEEDED`

Each error type has specific recovery strategies and user-friendly messages.

## Testing

The system includes comprehensive unit tests covering:

- All error recovery strategies
- Retry logic with exponential backoff
- Offline queue management
- Token refresh mechanism
- React hook behavior
- API client functionality

Run tests with:
```bash
npm test -- ErrorService.test.ts
npm test -- EnhancedApiClient.test.ts
npm test -- useEnhancedApi.test.tsx
```

## Performance Considerations

- **Request Deduplication**: Prevents multiple identical requests
- **Exponential Backoff**: Reduces server load during failures
- **Circuit Breaker**: Protects against cascade failures (future enhancement)
- **Offline Queue**: Minimizes data loss during network issues
- **Memory Management**: Automatic cleanup of completed requests

## Security Features

- **Token Refresh**: Automatic JWT token renewal
- **Request Correlation**: Unique IDs for request tracing
- **Error Sanitization**: No sensitive data in error messages
- **Timeout Protection**: Prevents hanging requests

## Monitoring and Observability

- **Error Classification**: Categorized by type and severity
- **Context Tracking**: Component and operation context
- **Retry Metrics**: Count and timing of retry attempts
- **Queue Status**: Offline request monitoring
- **Performance Tracking**: Request duration and success rates

## Future Enhancements

1. **Circuit Breaker Pattern**: Implement circuit breaker for endpoint protection
2. **Advanced Caching**: Integration with comprehensive caching service
3. **Metrics Dashboard**: Real-time error and performance monitoring
4. **Alert System**: Automated alerts for critical errors
5. **A/B Testing**: Different recovery strategies for different user groups

## Integration with Existing Codebase

The error handling system is designed to integrate seamlessly with the existing Sakinah application:

- **Compatible with existing ErrorBoundary components**
- **Uses existing error code classifications**
- **Integrates with Supabase authentication**
- **Maintains existing API contract patterns**
- **Follows established TypeScript and React patterns**

## Requirements Fulfilled

This implementation fulfills the requirements specified in Task 16:

✅ **ErrorService with different error type handlers**
✅ **Retry logic with exponential backoff**
✅ **Offline request queueing for network failures**
✅ **Token refresh logic for authentication errors**
✅ **Comprehensive unit tests for error handling**

The system provides a robust foundation for handling errors across the Sakinah application while maintaining a smooth user experience and minimizing data loss.