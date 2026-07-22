import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types/ApiResponse';
import {
  InvalidRepositoryError,
  FileSystemAccessError,
  FileAccessDeniedError,
  NoRepositoryAnalyzedError,
  AnalysisNotFoundError,
} from '../../core/errors/RepositoryErrors';
import { GitRepositoryError, EmptyGitRepositoryError } from '../../core/errors/GitErrors';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error(`[Error] ${req.method} ${req.url} ->`, err.message);

  let statusCode = 500;
  let code = 'INTERNAL_SERVER_ERROR';
  // Never leak internal error details (stack fragments, fs paths) for unexpected errors.
  let message = 'An unexpected error occurred.';

  if (err instanceof EmptyGitRepositoryError) {
    statusCode = 400;
    code = 'EMPTY_REPOSITORY';
    message = err.message;
  } else if (err instanceof InvalidRepositoryError || err instanceof GitRepositoryError) {
    statusCode = 422;
    code = 'INVALID_REPOSITORY';
    message = err.message;
  } else if (err instanceof FileAccessDeniedError) {
    statusCode = 403;
    code = 'ACCESS_DENIED';
    message = err.message;
  } else if (err instanceof FileSystemAccessError) {
    statusCode = 404;
    code = 'FILE_NOT_READABLE';
    message = 'The requested file could not be read.';
  } else if (err instanceof NoRepositoryAnalyzedError) {
    statusCode = 404;
    code = 'NOT_ANALYZED';
    message = err.message;
  } else if (err instanceof AnalysisNotFoundError) {
    statusCode = 404;
    code = 'ANALYSIS_NOT_FOUND';
    message = err.message;
  } else if (err.name === 'ZodError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = err.message;
  }

  const response: ApiResponse = {
    success: false,
    error: {
      code,
      message
    }
  };

  res.status(statusCode).json(response);
}
