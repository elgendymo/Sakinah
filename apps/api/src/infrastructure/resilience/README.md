# Error Handling and Resilience Infrastructure

This module provides comprehensive error handling and resilience patterns for the Sakinah API, implementing Task 3 from the frontend-backend-alignment specification.

## Features

- **Exponential Backoff Retry Logic** - Automatic retry with intelligent backoff for transient failures
- **Circuit Breaker Pattern** - Prevents cascade failures by opening circuits when error thresholds are exceeded
- **Rate Limiting** - Protects against abuse with configurable per-user and per-IP limits
- **Timeout Handling** - Prevents resource exhaustion with configurable request timeouts
- **Comprehensive Testing** - Full unit test coverage for all resilience patterns

## Components

### 1. RetryHandler

Implements exponential backoff retry logic with configurable parameters:

```typescript
import { RetryHandler } from './RetryHandler';

const handler = new RetryHandler({
  maxAttempts: 3,
  baseDelayMs: 1000,
  exponentialBase: 2,
  retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 429, 502, 503, 504]
});

const result = await handler.execute(async () => {
  // Your operation here
  return await fetchDataFromAPI();
});
```

**Features:**
- Configurable retry attempts (default: 3)
- Exponential backoff with jitter
- Smart error detection (network errors, HTTP status codes)
- Detailed logging and metrics

### 2. CircuitBreaker

Prevents cascade failures using the circuit breaker pattern:

```typescript
import { CircuitBreaker } from './CircuitBreaker';

const breaker = new CircuitBreaker('api-service', {
  failureThreshold: 5,
  recoveryTimeoutMs: 60000,
  requestTimeoutMs: 30000
});

const result = await breaker.execute(async () => {
  return await callExternalService();
});
```

**States:**
- **CLOSED** - Normal operation, requests pass through
- **OPEN** - Circuit is open, requests are rejected immediately
- **HALF_OPEN** - Testing recovery, limited requests allowed

### 3. RateLimiter

Provides flexible rate limiting with multiple strategies:

```typescript
import { RateLimitMiddleware } from './RateLimiter';

// Per-user rate limiting (100 req/min)
app.use(RateLimitMiddleware.userRateLimit());

// Per-IP rate limiting (1000 req/min)
app.use(RateLimitMiddleware.ipRateLimit());

// AI endpoint limiting (5 req/min)
app.use('/api/ai/*', RateLimitMiddleware.aiRateLimit());
```

**Configurations:**
- User-based: 100 requests/minute per authenticated user
- IP-based: 1000 requests/minute per IP address
- AI endpoints: 5 requests/minute per user
- Auth endpoints: 10 attempts/hour per IP

### 4. TimeoutHandler

Prevents resource exhaustion with configurable timeouts:

```typescript
import { TimeoutMiddleware } from './TimeoutHandler';

// API timeout (30 seconds)
app.use(TimeoutMiddleware.apiTimeout());

// Long operations (2 minutes)
app.use('/api/reports/*', TimeoutMiddleware.longOperationTimeout());

// Quick operations (5 seconds)
app.use('/api/health/*', TimeoutMiddleware.quickTimeout());
```

## ResilienceFactory

Provides high-level abstractions and predefined configurations:

### Resilient Operations

```typescript
import { ResilienceFactory } from './ResilienceFactory';

// Database operations
const dbOperation = ResilienceFactory.createResilientDatabaseOperation(
  async () => await db.query('SELECT * FROM users'),
  'user-query'
);

// External API calls
const apiOperation = ResilienceFactory.createResilientExternalApiCall(
  async () => await fetch('https://api.example.com/data'),
  'external-service'
);

// AI service calls
const aiOperation = ResilienceFactory.createResilientAICall(
  async () => await openai.chat.completions.create({ /* ... */ }),
  'gpt-4'
);
```

### Middleware Stacks

```typescript
// Standard API endpoints
app.use('/api/*', ...ResilienceFactory.createStandardMiddleware());

// AI endpoints
app.use('/api/ai/*', ...ResilienceFactory.createAIMiddleware());

// Authentication endpoints
app.use('/api/auth/*', ...ResilienceFactory.createAuthMiddleware());

// Sensitive endpoints
app.use('/api/admin/*', ...ResilienceFactory.createSensitiveMiddleware());
```

### Decorators

```typescript
class UserService {
  @ResilienceFactory.databaseResilient()
  async getUserById(id: string) {
    return await this.db.findById(id);
  }

  @ResilienceFactory.externalApiResilient('payment-service')
  async processPayment(amount: number) {
    return await this.paymentApi.charge(amount);
  }

  @ResilienceFactory.aiResilient('content-generation')
  async generateContent(prompt: string) {
    return await this.aiService.generate(prompt);
  }
}
```

## Configuration Examples

### Production Configuration

```typescript
// High availability production setup
const resilientOperation = ResilienceFactory.createResilientOperation(
  'critical-service',
  operation,
  {
    retry: {
      maxAttempts: 3,
      baseDelayMs: 1000,
      exponentialBase: 2,
      retryableErrors: ['ECONNRESET', 'ETIMEDOUT', 429, 502, 503, 504]
    },
    circuitBreaker: {
      failureThreshold: 5,
      recoveryTimeoutMs: 60000,
      failureRateThreshold: 0.5,
      minimumThroughput: 10
    },
    timeout: 30000
  }
);
```

### Development Configuration

```typescript
// Faster feedback for development
const resilientOperation = ResilienceFactory.createResilientOperation(
  'dev-service',
  operation,
  {
    retry: {
      maxAttempts: 2,
      baseDelayMs: 500,
    },
    circuitBreaker: {
      failureThreshold: 3,
      recoveryTimeoutMs: 10000,
    },
    timeout: 10000
  }
);
```

## Monitoring and Observability

### Circuit Breaker Metrics

```typescript
// Get all circuit breaker metrics
const metrics = ResilienceFactory.getAllCircuitBreakerMetrics();

// Example response:
{
  "user-service": {
    "state": "CLOSED",
    "totalRequests": 1000,
    "successfulRequests": 950,
    "failedRequests": 50,
    "rejectedRequests": 0,
    "failureRate": 0.05
  },
  "payment-service": {
    "state": "OPEN",
    "totalRequests": 100,
    "successfulRequests": 20,
    "failedRequests": 80,
    "rejectedRequests": 50,
    "failureRate": 0.8
  }
}
```

### Health Check Endpoint

```typescript
app.get('/api/health/resilience', (req, res) => {
  const circuitBreakers = ResilienceFactory.getAllCircuitBreakerMetrics();

  res.json({
    timestamp: new Date().toISOString(),
    circuitBreakers,
    status: Object.values(circuitBreakers).every(cb => cb.state === 'CLOSED')
      ? 'healthy'
      : 'degraded'
  });
});
```

## Error Types and Handling

### Retryable Errors

Automatically retried:
- Network errors: `ECONNRESET`, `ETIMEDOUT`, `ENOTFOUND`, `ECONNREFUSED`
- HTTP status codes: `408`, `429`, `502`, `503`, `504`

### Non-Retryable Errors

Fail immediately:
- Client errors: `400`, `401`, `403`, `404`
- Business logic errors: `422`
- Application-specific errors

### Custom Error Handling

```typescript
const customRetryHandler = new RetryHandler({
  maxAttempts: 5,
  retryableErrors: ['CUSTOM_ERROR', 'TRANSIENT_FAILURE'],
  baseDelayMs: 2000
});
```

## Testing

Comprehensive unit tests are provided for all components:

```bash
# Run all resilience tests
npm test __tests__/infrastructure/resilience/

# Run specific component tests
npm test __tests__/infrastructure/resilience/RetryHandler.test.ts
npm test __tests__/infrastructure/resilience/CircuitBreaker.test.ts
npm test __tests__/infrastructure/resilience/RateLimiter.test.ts
npm test __tests__/infrastructure/resilience/TimeoutHandler.test.ts
```

## Integration with Existing Codebase

The resilience infrastructure integrates seamlessly with the existing error handling patterns:

```typescript
import { ResilienceFactory } from '@/infrastructure/resilience';
import { Result } from '@/shared/result';

// Integrate with existing use cases
class SuggestPlanUseCase {
  @ResilienceFactory.aiResilient('plan-suggestion')
  async execute(input: PlanInput): Promise<Result<Plan, Error>> {
    try {
      const suggestion = await this.aiProvider.suggest(input);
      return Result.ok(suggestion);
    } catch (error) {
      return Result.error(error);
    }
  }
}
```

## Performance Considerations

- **Memory Usage**: Circuit breakers maintain minimal state, rate limiters use efficient in-memory or Redis storage
- **CPU Impact**: Retry logic adds minimal overhead, exponential backoff prevents excessive CPU usage
- **Network Impact**: Circuit breakers reduce unnecessary network calls when services are down
- **Latency**: Timeouts prevent hanging requests, rate limiting provides predictable response times

## Security Considerations

- Rate limiting prevents abuse and DoS attacks
- Timeout handling prevents resource exhaustion
- Circuit breakers prevent cascade failures that could be exploited
- All error messages are sanitized to prevent information leakage

## Future Enhancements

- Redis-based distributed rate limiting
- Prometheus metrics integration
- Advanced circuit breaker states (HALF_OPEN variations)
- Request prioritization and queuing
- Adaptive timeout calculation based on historical data