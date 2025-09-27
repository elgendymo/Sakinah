# Testing Strategy - Sakinah Application

## Overview
This document defines the comprehensive testing strategy for the Sakinah application, following the testing pyramid approach with clear coverage targets and testing best practices.

## Testing Pyramid

### 1. Unit Tests (70% of tests)
**Target Coverage: 80%**

#### Backend (apps/api)
- **Domain Layer**: Test all entities, value objects, and domain events
- **Application Layer**: Test use cases with mocked dependencies
- **Infrastructure Layer**: Test adapters, providers with mocked external services
- **Utilities**: Test all shared utilities, error handlers, result types

#### Frontend (apps/ui)
- **ViewModels**: Test all view model logic
- **Components**: Test component behavior with React Testing Library
- **Utilities**: Test all utility functions
- **Hooks**: Test custom React hooks

### 2. Integration Tests (20% of tests)
**Target Coverage: 60%**

#### API Integration
- Test complete request/response cycles
- Test middleware chain (auth, validation, error handling)
- Test database interactions with test database
- Test cache layer integration
- Test event dispatching

#### Frontend Integration
- Test page interactions
- Test API client integration
- Test authentication flows
- Test state management

### 3. End-to-End Tests (10% of tests)
**Target Coverage: Critical User Journeys**

#### Critical User Journeys
1. **Authentication Flow**
   - Magic link login
   - Session management
   - Logout

2. **Tazkiyah Plan Creation**
   - Onboarding flow
   - Plan suggestion
   - Habit creation

3. **Daily Habit Tracking**
   - Mark habit as complete
   - View streak progress
   - Handle streak breakage

4. **Spiritual Content**
   - Browse content
   - Filter by tags
   - View recommendations

## Testing Tools & Frameworks

### Backend Testing Stack
```json
{
  "unit": "vitest",
  "integration": "supertest + vitest",
  "e2e": "playwright",
  "mocking": "vitest mocks + tsyringe for DI",
  "coverage": "vitest coverage with c8"
}
```

### Frontend Testing Stack
```json
{
  "unit": "vitest + @testing-library/react",
  "integration": "vitest + msw for API mocking",
  "e2e": "playwright",
  "visual": "chromatic (optional)",
  "coverage": "vitest coverage"
}
```

## Test File Organization

```
apps/api/
├── __tests__/
│   ├── unit/
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   ├── events/
│   │   │   └── value-objects/
│   │   ├── application/
│   │   │   └── usecases/
│   │   └── infrastructure/
│   │       ├── cache/
│   │       ├── ai/
│   │       └── repos/
│   ├── integration/
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── database/
│   └── fixtures/
│       └── test-data.ts

apps/ui/
├── __tests__/
│   ├── unit/
│   │   ├── components/
│   │   ├── viewmodels/
│   │   └── utils/
│   ├── integration/
│   │   └── pages/
│   └── e2e/
│       └── journeys/
```

## Testing Best Practices

### 1. Test Naming Convention
```typescript
describe('ComponentName/ClassName', () => {
  describe('methodName', () => {
    it('should [expected behavior] when [condition]', () => {
      // Test implementation
    });
  });
});
```

### 2. AAA Pattern
```typescript
it('should complete habit and emit event', async () => {
  // Arrange
  const habit = createTestHabit();
  const date = new Date('2024-01-15');

  // Act
  habit.markCompleted(date);

  // Assert
  expect(habit.streakCount).toBe(1);
  expect(habit.getDomainEvents()).toHaveLength(1);
});
```

### 3. Test Data Builders
```typescript
class HabitTestBuilder {
  private params = {
    userId: 'test-user-id',
    title: 'Test Habit',
    // ... defaults
  };

  withStreak(count: number): this {
    this.params.streakCount = count;
    return this;
  }

  build(): Habit {
    return Habit.create(this.params);
  }
}
```

### 4. Mocking Strategy
- Mock external dependencies (database, APIs, cache)
- Don't mock what you own (domain logic)
- Use dependency injection for easy mocking
- Create reusable mock factories

## Coverage Requirements

### Minimum Coverage Thresholds
```json
{
  "branches": 70,
  "functions": 75,
  "lines": 80,
  "statements": 80
}
```

### Critical Code Coverage
These areas must have >90% coverage:
- Authentication/Authorization logic
- Payment processing (if applicable)
- Data validation
- Domain business rules
- Error handling

## CI/CD Integration

### Pre-commit Hooks
```bash
# .husky/pre-commit
npm run test:unit -- --run --changed
npm run lint
```

### Pull Request Checks
```yaml
- name: Run Tests
  run: |
    npm run test:unit -- --coverage
    npm run test:integration
    npm run test:e2e -- --reporter=github
```

### Coverage Reporting
- Generate coverage reports in CI
- Block PRs if coverage drops below threshold
- Publish coverage badges to README

## Performance Testing

### Load Testing
- Tool: k6 or Artillery
- Target: 1000 concurrent users
- Response time: <200ms p95

### Stress Testing
- Identify breaking points
- Test cache performance
- Database connection pooling

## Security Testing

### OWASP Top 10
- SQL Injection: Parameterized queries
- XSS: Input sanitization tests
- Authentication: JWT validation tests
- Authorization: RLS policy tests

## Test Data Management

### Development
- SQLite with seeded test data
- Deterministic data generation
- Reset between test runs

### Staging/Production
- Anonymized production data subset
- Synthetic data generation
- Data cleanup scripts

## Monitoring & Alerting

### Test Metrics
- Test execution time trends
- Flaky test detection
- Coverage trends
- Test failure patterns

### Dashboards
- Test results dashboard
- Coverage trends
- Performance regression detection

## Test Maintenance

### Regular Reviews
- Quarterly test audit
- Remove obsolete tests
- Update test data
- Refactor test utilities

### Documentation
- Keep test documentation current
- Document test utilities
- Maintain test data schemas

## Example Test Implementation

### Unit Test Example
```typescript
// apps/api/__tests__/unit/domain/entities/Habit.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { Habit } from '@/domain/entities/Habit';
import { HabitCompletedEvent } from '@/domain/events/HabitEvents';

describe('Habit', () => {
  describe('markCompleted', () => {
    it('should increment streak when completed consecutively', () => {
      const habit = Habit.create({
        userId: 'user-1',
        planId: 'plan-1',
        title: 'Morning Prayer',
        schedule: { freq: 'daily' },
        streakCount: 5,
        lastCompletedOn: new Date('2024-01-14')
      });

      habit.markCompleted(new Date('2024-01-15'));

      expect(habit.streakCount).toBe(6);
      expect(habit.getDomainEvents()).toContainEqual(
        expect.objectContaining({
          eventName: 'HabitCompleted',
          newStreakCount: 6,
          isStreakMaintained: true
        })
      );
    });
  });
});
```

### Integration Test Example
```typescript
// apps/api/__tests__/integration/routes/habit.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '@/server';
import { createTestUser, createTestHabit } from '../fixtures';

describe('POST /api/habits/:id/complete', () => {
  it('should mark habit as complete and return updated habit', async () => {
    const user = await createTestUser();
    const habit = await createTestHabit({ userId: user.id });
    const token = generateTestToken(user.id);

    const response = await request(app)
      .post(`/api/habits/${habit.id}/complete`)
      .set('Authorization', `Bearer ${token}`)
      .send({ date: '2024-01-15' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: habit.id,
      streakCount: 1,
      lastCompletedOn: expect.any(String)
    });
  });
});
```

## Continuous Improvement

### Metrics to Track
1. Test execution time
2. Test coverage percentage
3. Defect escape rate
4. Test maintenance cost
5. False positive rate

### Review Cycle
- Monthly: Review test failures and flaky tests
- Quarterly: Coverage analysis and strategy review
- Annually: Complete testing strategy review

## Conclusion

This testing strategy ensures high-quality, maintainable code with comprehensive coverage across all layers of the application. Regular reviews and updates will keep the strategy aligned with project evolution.