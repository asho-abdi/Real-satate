import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import morgan from 'morgan';

import env from './config/env.js';
import { requestContext } from './middlewares/requestContext.js';
import { apiRateLimiter } from './middlewares/rateLimiter.js';
import { notFoundHandler, errorHandler } from './middlewares/errorHandler.js';
import { uploadRoot } from './middlewares/upload.js';
import apiRoutes from './routes/index.js';
import swaggerRoutes from './docs/swagger.routes.js';

/**
 * Build and configure the Express application.
 * @returns {import('express').Express}
 */
export function createExpressApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
  app.use(compression());
  const allowedOrigins = new Set(
    [
      env.FRONTEND_URL,
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
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
    }),
  );
  app.use(morgan(env.isProduction ? 'combined' : 'dev'));
  app.use(requestContext);
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(apiRateLimiter);

  app.get('/health', (_req, res) => {
    res.json({
      success: true,
      data: {
        status: 'ok',
        service: env.APP_NAME,
        env: env.NODE_ENV,
        timestamp: new Date().toISOString(),
      },
    });
  });

  app.use('/uploads', express.static(uploadRoot));
  app.use('/api/docs', swaggerRoutes);
  app.use(env.API_PREFIX, apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createExpressApp;
