// Example usage of the resilience infrastructure

import { ResilienceFactory } from './ResilienceFactory';
import { CircuitBreakerManager } from './CircuitBreaker';
import { RateLimitMiddleware } from './RateLimiter';
import { TimeoutMiddleware } from './TimeoutHandler';
import { Result } from '@/shared/result';

// Example 1: Database operation with resilience
async function exampleDatabaseOperation() {
  const resilientDbQuery = ResilienceFactory.createResilientDatabaseOperation(
    async () => {
      // Simulate database query
      return { id: 1, name: 'Test User' };
    },
    'user-query'
  );

  const result = await resilientDbQuery();

  if (Result.isOk(result)) {
    console.log('Database query succeeded:', result.value);
  } else {
    console.error('Database query failed:', result.error.message);
  }
}

// Example 2: External API call with resilience
async function exampleExternalApiCall() {
  const resilientApiCall = ResilienceFactory.createResilientExternalApiCall(
    async () => {
      // Simulate external API call
      const response = await fetch('https://api.example.com/data');
      return response.json();
    },
    'external-api'
  );

  const result = await resilientApiCall();

  if (Result.isOk(result)) {
    console.log('API call succeeded:', result.value);
  } else {
    console.error('API call failed:', result.error.message);
  }
}

// Example 3: AI service call with resilience
async function exampleAiServiceCall() {
  const resilientAiCall = ResilienceFactory.createResilientAICall(
    async () => {
      // Simulate AI service call
      return 'Generated AI response';
    },
    'gpt-4'
  );

  const result = await resilientAiCall();

  if (Result.isOk(result)) {
    console.log('AI call succeeded:', result.value);
  } else {
    console.error('AI call failed:', result.error.message);
  }
}

// Example 4: Express.js middleware integration
import express from 'express';

const app = express();

// Apply resilience middleware stack
const standardMiddleware = ResilienceFactory.createStandardMiddleware();
standardMiddleware.forEach(middleware => app.use(middleware));

// Route with AI-specific middleware
const aiMiddleware = ResilienceFactory.createAIMiddleware();
app.use('/api/ai/*', ...aiMiddleware);

// Route with auth-specific middleware
const authMiddleware = ResilienceFactory.createAuthMiddleware();
app.use('/api/auth/*', ...authMiddleware);

// Get circuit breaker metrics endpoint
app.get('/api/health/circuit-breakers', (req, res) => {
  const metrics = ResilienceFactory.getAllCircuitBreakerMetrics();
  res.json(metrics);
});

// Example 5: Using decorators for resilience
class ExampleService {
  @ResilienceFactory.databaseResilient()
  async getUserById(id: string) {
    // Database operation that will be automatically protected with:
    // - Retry logic for connection errors
    // - Circuit breaker for repeated failures
    // - Timeout protection
    return { id, name: 'User' + id };
  }

  @ResilienceFactory.externalApiResilient('payment-service')
  async processPayment(amount: number) {
    // External API call that will be automatically protected
    return { transactionId: 'txn_' + Date.now(), amount };
  }

  @ResilienceFactory.aiResilient('content-generation')
  async generateContent(prompt: string) {
    // AI service call with specialized resilience patterns
    return 'Generated content for: ' + prompt;
  }
}

export {
  exampleDatabaseOperation,
  exampleExternalApiCall,
  exampleAiServiceCall,
  ExampleService
};