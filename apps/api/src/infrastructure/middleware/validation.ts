import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import {
  ErrorCode,
  createAppError,
  handleExpressError,
  getExpressTraceId
} from '@/shared/errors';

export function validateRequest(schema: z.ZodSchema<any>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validatedData = schema.parse(req.body);
      req.body = validatedData;
      next();
    } catch (error) {
      const traceId = getExpressTraceId(req);

      if (error instanceof z.ZodError) {
        const appError = createAppError(
          ErrorCode.VALIDATION_ERROR,
          'Request validation failed',
          undefined,
          {
            details: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message,
              code: err.code
            }))
          }
        );
        const { response, status } = handleExpressError(appError, traceId);
        res.status(status).json(response);
        return;
      }

      const appError = createAppError(ErrorCode.VALIDATION_ERROR, 'Invalid request data');
      const { response, status } = handleExpressError(appError, traceId);
      res.status(status).json(response);
    }
  };
}

export function validateBody(schema: z.ZodSchema<any>) {
  return validateRequest(schema);
}

export function validateQuery(schema: z.ZodSchema<any>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validatedData = schema.parse(req.query);
      req.query = validatedData as any;
      next();
    } catch (error) {
      const traceId = getExpressTraceId(req);

      if (error instanceof z.ZodError) {
        const appError = createAppError(
          ErrorCode.VALIDATION_ERROR,
          'Query validation failed',
          undefined,
          {
            details: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message,
              code: err.code
            }))
          }
        );
        const { response, status } = handleExpressError(appError, traceId);
        res.status(status).json(response);
        return;
      }

      const appError = createAppError(ErrorCode.VALIDATION_ERROR, 'Invalid query parameters');
      const { response, status } = handleExpressError(appError, traceId);
      res.status(status).json(response);
    }
  };
}

export function validateParams(schema: z.ZodSchema<any>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validatedData = schema.parse(req.params);
      req.params = validatedData;
      next();
    } catch (error) {
      const traceId = getExpressTraceId(req);

      if (error instanceof z.ZodError) {
        const appError = createAppError(
          ErrorCode.VALIDATION_ERROR,
          'Parameter validation failed',
          undefined,
          {
            details: error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message,
              code: err.code
            }))
          }
        );
        const { response, status } = handleExpressError(appError, traceId);
        res.status(status).json(response);
        return;
      }

      const appError = createAppError(ErrorCode.VALIDATION_ERROR, 'Invalid parameters');
      const { response, status } = handleExpressError(appError, traceId);
      res.status(status).json(response);
    }
  };
}