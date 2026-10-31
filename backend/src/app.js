import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import morgan from 'morgan';

import env from './config/env.js';
import { requestContext } from './middlewares/requestContext.js';
import { apiRateLimiter } from './middlewares/rateLimiter.js';
import { notFoundHandler, errorHandler } from './middlewares/errorHandler.js';
import apiRoutes from './routes/index.js';
import swaggerRoutes from './docs/swagger.routes.js';

/**
 * Build and configure the Express application.
 * @returns {import('express').Express}
 */
export function createExpressApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: env.isProduction
        ? {
            useDefaults: true,
            directives: {
              defaultSrc: ["'none'"],
              frameAncestors: ["'none'"],
            },
          }
        : false,
      referrerPolicy: { policy: 'no-referrer' },
      hsts: env.isProduction
        ? {
            // Enable only when HTTPS is confirmed in front of this app.
            // Safe default: off until FRONTEND_URL is https://
            maxAge: String(env.FRONTEND_URL || '').startsWith('https://') ? 15552000 : 0,
            includeSubDomains: false,
          }
        : false,
    }),
  );
  app.use(compression());
  const allowedOrigins = new Set(
    [
      env.FRONTEND_URL,
      ...(env.CORS_ORIGINS || []),
      ...(!env.isProduction
        ? [
            'http://localhost:5173',
            'http://localhost:5174',
            'http://127.0.0.1:5173',
            'http://127.0.0.1:5174',
          ]
        : []),
    ].filter(Boolean),
  );

  app.use(
    cors({
      origin(origin, callback) {
        // Allow non-browser / same-origin tools (no Origin header)
        if (!origin || allowedOrigins.has(origin)) {
          return callback(null, true);
        }
        if (!env.isProduction) {
          // Dev: reflect any localhost Vite origin so port hops don't break CORS
          if (/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
            return callback(null, true);
          }
        }
        return callback(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
      maxAge: 600,
    }),
  );
  app.use(morgan(env.isProduction ? 'combined' : 'dev'));
  app.use(requestContext);
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(apiRateLimiter);

  app.get('/health', (_req, res) => {
    res.json({
      success: true,
      data: {
        status: 'ok',
        service: env.APP_NAME,
        // Do not expose NODE_ENV details beyond a coarse flag
        env: env.isProduction ? 'production' : 'non-production',
        timestamp: new Date().toISOString(),
      },
    });
  });

  // Swagger UI is a reconnaissance surface — never expose in production
  if (!env.isProduction) {
    app.use('/api/docs', swaggerRoutes);
  }
  app.use(env.API_PREFIX, apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createExpressApp;
