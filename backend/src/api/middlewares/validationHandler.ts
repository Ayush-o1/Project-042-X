import { Request, Response, NextFunction } from 'express';
import { ZodTypeAny, ZodError } from 'zod';
import { ApiResponse } from '../types/ApiResponse';

export const validateRequest = (schema: ZodTypeAny) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.issues || [];
        const message = issues.length > 0 
          ? issues.map((e: any) => `${e.path?.join('.') || 'body'}: ${e.message}`).join(', ')
          : error.message;

        const response: ApiResponse = {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message,
          },
        };
        return res.status(400).json(response);
      }
      next(error);
    }
  };
};
