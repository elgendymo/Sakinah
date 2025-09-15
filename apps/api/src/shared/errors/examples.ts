/**
 * Usage Examples for the Centralized Error Handling System
 *
 * This file demonstrates how to use the new error handling system
 * across different layers of the application.
 */

import { Request, Response, NextFunction } from 'express';
import {
  ErrorCode,
  createErrorResponse,
  createSuccessResponse,
  handleApiError,
  createAppError,
  getTraceId,
  logger,
  createRequestLogger,
  createTimedLogger,
  ErrorMapper,
  getDbType
} from './index';

// Example 1: Express Route Handler with Error Handling
export async function exampleExpressRoute(req: Request, res: Response, _next: NextFunction) {
  const traceId = getTraceId(req as any);
  const requestLogger = createRequestLogger(traceId, req.body?.userId);

  try {
    requestLogger.info('Processing example request', {
      method: req.method,
      url: req.url
    });

    // Simulate some business logic
    const result = await someBusinessLogic();

    // Success response
    const response = createSuccessResponse(result, traceId);
    res.json(response);

    requestLogger.info('Request completed successfully');

  } catch (error) {
    requestLogger.error('Request failed', { error: error.message }, error);

    const errorResponse = handleApiError(error, traceId);
    res.status(500).json(errorResponse);
  }
}

// Example 2: Database Operation with Error Mapping
export async function exampleDatabaseOperation(userId: string) {
  const traceId = crypto.randomUUID();
  const timedLogger = createTimedLogger(traceId, 'getUserData', userId);

  try {
    // Simulate database call
    const dbResult = await database.getUser(userId);

    // Handle database-specific errors
    if (dbResult.error) {
      const errorCode = ErrorMapper.mapToApiError(dbResult.error, getDbType());
      timedLogger.finish(false, { error: errorCode });
      throw createAppError(errorCode, dbResult.error.message, dbResult.error);
    }

    timedLogger.finish(true, { userId });
    return dbResult.data;

  } catch (error) {
    timedLogger.error('Database operation failed', { userId, error: error.message }, error);
    throw error;
  }
}

// Example 3: Repository Pattern with Centralized Error Handling
export class ExampleRepository {
  async getUserById(id: string): Promise<any> {
    const traceId = crypto.randomUUID();
    const logger = createRequestLogger(traceId);

    try {
      logger.debug('Fetching user by ID', { userId: id });

      // Simulate database query
      const result = await database.getUser(id);

      return { data: result, error: null };

    } catch (error) {
      logger.error('Failed to fetch user', { userId: id }, error);

      const dbErrorCode = ErrorMapper.mapDatabaseError(error, getDbType());
      return {
        data: null,
        error: {
          code: dbErrorCode,
          message: error.message || 'Failed to fetch user',
          details: error
        }
      };
    }
  }
}

// Example 4: Application Service with Business Logic Error Handling
export class ExampleService {
  // private _repository = new ExampleRepository();

  async createUser(userData: CreateUserData): Promise<any> {
    const traceId = crypto.randomUUID();
    const logger = createRequestLogger(traceId);

    try {
      logger.info('Creating new user', { email: userData.email });

      // Validation
      if (!userData.email) {
        return { ok: false, error: ErrorCode.REQUIRED_FIELD };
      }

      // Check if user exists (would normally check database)
      // Simulated check omitted for brevity

      // Create user (would normally create in database)
      const createResult = { data: { id: '1', ...userData } };

      logger.info('User created successfully', { userId: createResult.data.id });
      return { ok: true, value: createResult.data };

    } catch (error) {
      logger.error('Failed to create user', { email: userData.email }, error);
      return { ok: false, error: ErrorCode.SERVER_ERROR };
    }
  }
}

// Example 5: Next.js API Route Handler
export async function POST(request: any) {
  const traceId = getTraceId(request);
  const logger = createRequestLogger(traceId);

  try {
    const body = await request.json();
    logger.info('Processing API request', { body });

    // Business logic
    const service = new ExampleService();
    const result = await service.createUser(body);

    if (!result.ok) {
      const { response, status } = createErrorResponse(
        result.error,
        'Error occurred',
        traceId
      );
      return NextResponse.json(response, { status });
    }

    const response = createSuccessResponse(result.value, traceId);
    return NextResponse.json(response);

  } catch (error) {
    logger.error('Unhandled error in API route', {}, error);
    return handleApiError(error, traceId);
  }
}

// Example 6: Frontend Error Handling
export async function frontendApiCall(endpoint: string, data: any) {
  const traceId = crypto.randomUUID();

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Trace-Id': traceId
      },
      body: JSON.stringify(data)
    });

    const json = await response.json();

    if (!(json as any).ok) {
      // Handle API error response
      throw new Error((json as any).message || 'Request failed');
    }

    return (json as any).data;

  } catch (error) {
    // Log error on frontend (could send to logging service)
    console.error(`[${traceId}] API call failed:`, error);
    throw error;
  }
}

// Example 7: Global Error Handler Setup
export function setupErrorHandlers() {
  // Setup global unhandled error logging
  process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
    logger.error('Unhandled Promise Rejection', {
      reason: reason?.toString(),
      promise: promise?.toString()
    }, reason instanceof Error ? reason : new Error(String(reason)));
  });

  process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception', {}, error);
    process.exit(1);
  });
}

// Types used in examples (would be defined elsewhere)
// Note: These would normally be imported from type definitions
export type User = {
  id: string;
  email: string;
  name: string;
};

export type CreateUserData = {
  email: string;
  name: string;
};

// Mock implementations
const database = {
  getUser: async (_id: string) => ({ data: null, error: null })
};

const someBusinessLogic = async () => ({ result: 'success' });

const NextResponse = {
  json: (data: any, options?: any) => new Response(JSON.stringify(data), options)
};

declare const crypto: { randomUUID(): string };

// Remove unused interfaces to fix warnings
// interface User and DatabaseResult moved to avoid "never used" errors