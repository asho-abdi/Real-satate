import env from '../config/env.js';
import { AppError } from '../utils/AppError.js';

/**
 * 404 handler for unmatched routes.
 * @type {import('express').RequestHandler}
 */
export function notFoundHandler(req, res, next) {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404, { code: 'NOT_FOUND' }));
}

/**
 * Central error handler. Never leaks stack traces in production.
 * @type {import('express').ErrorRequestHandler}
 */
export function errorHandler(err, req, res, _next) {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal server error';
  let details = err.details ?? null;
  let code = err.code || null;

  // express-validator style / AppError with validation array
  if (Array.isArray(err.errors) || Array.isArray(err.details)) {
    statusCode = statusCode === 500 ? 422 : statusCode;
    details = Array.isArray(err.details) ? err.details : err.errors;
    message = err.message || 'Validation failed';
    code = code || 'VALIDATION_ERROR';
  }

  // Prisma known request errors — never leak column/constraint meta in production
  if (err.code === 'P2002') {
    statusCode = 409;
    message = 'A record with this unique value already exists';
    code = 'UNIQUE_CONSTRAINT';
    details = env.isProduction ? null : err.meta ?? details;
  } else if (err.code === 'P2025') {
    statusCode = 404;
    message = 'Record not found';
    code = 'NOT_FOUND';
    details = env.isProduction ? null : err.meta ?? details;
  } else if (typeof err.code === 'string' && err.code.startsWith('P') && !err.isOperational) {
    statusCode = 400;
    message = env.isProduction ? 'Database request failed' : err.message;
    code = env.isProduction ? 'DB_ERROR' : err.code;
  }

  // Multer rejects oversized uploads as a generic error. Surface a client error
  // so the booking form does not show "Internal server error".
  if (
    err.name === 'MulterError' ||
    err.code === 'LIMIT_FILE_SIZE' ||
    err.code === 'LIMIT_FILE_COUNT' ||
    err.code === 'LIMIT_UNEXPECTED_FILE'
  ) {
    const tooBig = err.code === 'LIMIT_FILE_SIZE';
    statusCode = tooBig ? 413 : 400;
    code = err.code || 'UPLOAD_ERROR';
    message = tooBig
      ? `File is too large. Maximum size is ${env.MAX_FILE_SIZE_MB} MB`
      : 'Could not upload that file';
    details = null;
  }

  if (statusCode >= 500 && env.isProduction) {
    message = 'Internal server error';
    details = null;
  }

  if (statusCode >= 500) {
    console.error('[error]', {
      requestId: req.requestId,
      message: err.message,
      stack: err.stack,
      code: err.code,
    });
  }

  const body = {
    success: false,
    error: {
      message,
      ...(code ? { code } : {}),
      ...(details != null ? { details } : {}),
      ...(req.requestId ? { requestId: req.requestId } : {}),
      ...(!env.isProduction && err.stack ? { stack: err.stack } : {}),
    },
  };

  return res.status(statusCode).json(body);
}

export default { notFoundHandler, errorHandler };
