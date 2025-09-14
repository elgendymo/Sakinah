# Centralized Error Handling System

This centralized error handling system provides a consistent, reusable pattern for handling errors across all layers of the Sakinah application. It follows Clean Architecture principles and provides structured logging, user-friendly error messages, and trace correlation for debugging.

## Architecture Overview

### Core Components

1. **Error Types & Enums** (`errorCodes.ts`, `types.ts`)
   - Hierarchical error codes for different layers
   - Structured error interfaces
   - Result pattern types

2. **Error Mapping** (`errorMapper.ts`)
   - Maps database-specific errors to standardized codes
   - Supports both Supabase and SQLite backends
   - Automatic error code normalization

3. **User Messages** (`errorMessages.ts`)
   - User-friendly error messages
   - Error code normalization and aliases
   - Contextual messaging for different scenarios

4. **Response Utilities** (`errorResponse.ts`)
   - Standardized API response format
   - Trace ID correlation
   - HTTP status code mapping

5. **Structured Logging** (`../logging/logger.ts`)
   - Environment-aware logging (dev vs production)
   - Data sanitization for production
   - Request tracing and correlation

6. **Compatibility Bridge** (`bridge.ts`)
   - Bridges legacy and new error formats
   - Backwards compatibility during migration
   - Format conversion utilities

## Usage Examples

### 1. Database Operations

```typescript
// Repository layer
export class UserRepository {
  async getUserById(id: string): Promise<Result<User>> {
    return RepositoryResultHandler.wrapOperation(async () => {
      const result = await this.db.getUserById(id);
      const handled = RepositoryResultHandler.handleRequiredResult(result, 'User');

      if (Result.isError(handled)) {
        throw handled.error;
      }

      return handled.value;
    });
  }
}
```

### 2. API Route Handlers

```typescript
// Express route
export async function getUser(req: Request, res: Response) {
  const traceId = getExpressTraceId(req);
  const logger = createRequestLogger(traceId);

  try {
    const result = await userService.getUserById(req.params.id);

    if (Result.isError(result)) {
      const { response, status } = handleExpressError(result.error, traceId);
      return res.status(status).json(response);
    }

    const response = createSuccessResponse(result.value, traceId);
    res.json(response);

  } catch (error) {
    logger.error('Unhandled error in getUser', { userId: req.params.id }, error);
    const { response, status } = handleExpressError(error, traceId);
    res.status(status).json(response);
  }
}
```

### 3. Service Layer

```typescript
// Application service
export class UserService {
  async createUser(userData: CreateUserInput): Promise<Result<User, ErrorCode>> {
    const traceId = crypto.randomUUID();
    const logger = createRequestLogger(traceId);

    try {
      // Validation
      if (!userData.email) {
        return failure(ErrorCode.REQUIRED_FIELD, 'Email is required');
      }

      // Business logic
      const result = await this.repository.createUser(userData);

      if (Result.isError(result)) {
        return failure(ErrorCode.DATABASE_ERROR, 'Failed to create user');
      }

      return success(result.value);

    } catch (error) {
      logger.error('User creation failed', { email: userData.email }, error);
      return failure(ErrorCode.SERVER_ERROR, 'User creation failed');
    }
  }
}
```

### 4. Frontend Integration

```typescript
// Frontend API client
async function createUser(userData: CreateUserInput) {
  const traceId = crypto.randomUUID();

  try {
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Trace-Id': traceId
      },
      body: JSON.stringify(userData)
    });

    const json = await response.json();

    if (!json.ok) {
      throw new Error(json.message || 'Request failed');
    }

    return json.data;

  } catch (error) {
    console.error(`[${traceId}] User creation failed:`, error);
    throw error;
  }
}
```

## Error Code Hierarchy

### API Layer Codes
- **Authentication (401)**: `unauthorized`, `invalid_code`, `session_expired`
- **Bad Request (400)**: `invalid_input`, `required_field`, `validation_error`
- **Not Found (404)**: `user_not_found`, `habit_not_found`, `plan_not_found`
- **Conflict (409)**: `email_already_exists`, `habit_already_exists`
- **Server Errors (500)**: `server_error`, `database_error`, `ai_provider_error`

### Database Layer Codes
- **Connection**: `db_connection_failed`, `db_timeout`
- **Queries**: `db_query_failed`, `db_constraint_violation`
- **Authorization**: `db_unauthorized`, `db_permission_denied`
- **Data**: `db_not_found`, `db_invalid_data`

## Response Format

All API responses follow this standardized format:

```typescript
interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;                  // Success data
  next?: string;            // Navigation state
  errorCode?: ErrorCode;    // Machine-readable error code
  message?: string;         // Human-readable error message
  traceId: string;         // Request correlation ID
}
```

**Success Response:**
```json
{
  "ok": true,
  "data": { "userId": "123", "email": "user@example.com" },
  "traceId": "uuid-1234"
}
```

**Error Response:**
```json
{
  "ok": false,
  "errorCode": "user_not_found",
  "message": "User account not found. Please check your credentials.",
  "traceId": "uuid-1234"
}
```

## Logging & Tracing

### Request Correlation
Every request gets a unique `traceId` that flows through all layers:

```
Client Request → API Route → Service → Repository → Database
    [uuid-123] → [uuid-123] → [uuid-123] → [uuid-123] → [uuid-123]
```

### Log Formats

**Development (Human-readable):**
```
[2024-01-15T10:30:00Z][INFO][uuid-123][User: user123] Processing user creation
  Context: { email: "user@example.com", action: "create" }
```

**Production (Structured JSON):**
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "level": "info",
  "message": "Processing user creation",
  "traceId": "uuid-123",
  "userId": "user123",
  "email": "[REDACTED]"
}
```

### Data Sanitization

In production, sensitive fields are automatically redacted:
- `password`, `token`, `apiKey`, `secret`
- `email`, `phone`, `ssn`, `creditCard`
- `userId`, `id` (to prevent correlation attacks)

## Migration Guide

### From Legacy Error System

The new system provides backwards compatibility through the bridge layer:

```typescript
// Legacy format still works
const result = await legacyDatabaseOperation();
const handled = RepositoryResultHandler.handleSingleResult(result);

// Bridge automatically converts legacy DatabaseResult to new format
```

### Gradual Migration Steps

1. **Phase 1**: Install new error system (✅ Complete)
2. **Phase 2**: Update repositories to use new handlers
3. **Phase 3**: Update services to use new Result patterns
4. **Phase 4**: Update routes to use new response formats
5. **Phase 5**: Remove legacy error classes

## Best Practices

### Error Handling Guidelines

1. **Use specific error codes** rather than generic ones
2. **Include trace IDs** in all logging and responses
3. **Sanitize sensitive data** in production logs
4. **Map database errors** to appropriate API errors
5. **Provide user-friendly messages** for frontend display

### Security Considerations

1. **Never expose internal error details** to clients
2. **Redact sensitive information** in logs
3. **Use consistent error messages** to avoid information leakage
4. **Validate all inputs** before processing
5. **Log security events** with appropriate severity

### Performance Considerations

1. **Minimize error object creation** in hot paths
2. **Use structured logging** for better query performance
3. **Batch error handling** when processing multiple items
4. **Cache error message mappings** for frequently used codes
5. **Consider async logging** for non-critical error events

## Testing

### Error Scenario Testing

```typescript
// Test error code mapping
test('maps database unique constraint to conflict error', () => {
  const dbError = { message: 'UNIQUE constraint failed: users.email' };
  const errorCode = ErrorMapper.mapSQLiteError(dbError);

  expect(errorCode).toBe(DatabaseErrorCode.DB_UNIQUE_VIOLATION);

  const apiError = ErrorMapper.mapDatabaseToApiError(errorCode);
  expect(apiError).toBe(ErrorCode.CONFLICT);
});

// Test error response format
test('creates standardized error response', () => {
  const response = createErrorResponse(
    ErrorCode.USER_NOT_FOUND,
    'Custom message',
    'trace-123'
  );

  expect(response.response).toMatchObject({
    ok: false,
    errorCode: 'user_not_found',
    message: 'Custom message',
    traceId: 'trace-123'
  });

  expect(response.status).toBe(404);
});
```

## Monitoring & Observability

The error system is designed to integrate with monitoring tools:

1. **Structured logs** can be ingested by log aggregation systems
2. **Trace IDs** enable request correlation across services
3. **Error codes** enable automated alerting and dashboards
4. **Performance metrics** can be extracted from timed operations
5. **Error rates** can be monitored by error code categories

This centralized approach ensures consistent error handling, improved debugging capabilities, and better user experience across the entire application.