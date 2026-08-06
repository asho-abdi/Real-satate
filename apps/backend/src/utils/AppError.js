export class AppError extends Error {
  /**
   * @param {string} message
   * @param {number} [statusCode=500]
   * @param {{ details?: unknown, isOperational?: boolean, code?: string }} [options]
   */
  constructor(message, statusCode = 500, options = {}) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = options.details ?? null;
    this.isOperational = options.isOperational !== false;
    this.code = options.code ?? null;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export default AppError;
