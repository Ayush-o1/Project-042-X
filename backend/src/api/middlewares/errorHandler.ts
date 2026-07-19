import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types/ApiResponse';
import { InvalidRepositoryError, FileSystemAccessError } from '../../core/errors/RepositoryErrors';
import { GitRepositoryError, EmptyGitRepositoryError } from '../../core/errors/GitErrors';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error(`[Error] ${req.method} ${req.url} ->`, err.message);

  let statusCode = 500;
  let code = 'INTERNAL_SERVER_ERROR';

  if (err instanceof EmptyGitRepositoryError) {
    statusCode = 400;
    code = 'EMPTY_REPOSITORY';
  } else if (err instanceof InvalidRepositoryError || err instanceof GitRepositoryError) {
    statusCode = 422;
    code = 'INVALID_REPOSITORY';
  } else if (err instanceof FileSystemAccessError) {
    statusCode = 403;
    code = 'ACCESS_DENIED';
  } else if (err.name === 'ZodError') {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
  } else if (err.message === 'No repository has been analyzed yet.') {
    statusCode = 404;
    code = 'NOT_FOUND';
  }

  const response: ApiResponse = {
    success: false,
    error: {
      code,
      message: err.message
    }
  };

  res.status(statusCode).json(response);
}
