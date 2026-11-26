import rateLimit from 'express-rate-limit';
import env from '../config/env.js';

/**
 * General API budget. A single admin screen loads many reads (lists, schedules,
 * unit profiles), so the production floor stays high enough for normal work.
 * Login and password reset keep their own tighter limiters.
 */
export const apiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.isProduction ? Math.max(env.RATE_LIMIT_MAX, 3000) : Math.max(env.RATE_LIMIT_MAX, 5000),
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !env.isProduction && env.RATE_LIMIT_MAX <= 0,
  message: {
    success: false,
    error: {
      message: 'Too many requests, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
});

/** Stricter limiter for login / password reset (always on). */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.isProduction ? 10 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many auth attempts, please try again later',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
    },
  },
});

/** Extra-tight limiter for password reset request (email flooding). */
export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: env.isProduction ? 5 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      message: 'Too many reset requests, please try again later',
      code: 'RESET_RATE_LIMIT_EXCEEDED',
    },
  },
});

export default apiRateLimiter;
