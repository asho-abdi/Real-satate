import env from './config/env.js';
import { createExpressApp } from './app.js';
import { disconnectPrisma } from './config/database.js';

const app = createExpressApp();

const server = app.listen(env.PORT, () => {
  console.info(`[${env.APP_NAME}] listening on port ${env.PORT} (${env.NODE_ENV})`);
  console.info(`[${env.APP_NAME}] API prefix: ${env.API_PREFIX}`);
});

async function shutdown(signal) {
  console.info(`[${env.APP_NAME}] received ${signal}, shutting down…`);
  server.close(async () => {
    try {
      await disconnectPrisma();
      console.info(`[${env.APP_NAME}] Prisma disconnected`);
      process.exit(0);
    } catch (err) {
      console.error(`[${env.APP_NAME}] Error during shutdown`, err);
      process.exit(1);
    }
  });

  // Force exit if connections hang
  setTimeout(() => {
    console.error(`[${env.APP_NAME}] Forced shutdown`);
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
  shutdown('uncaughtException');
});

export default server;
