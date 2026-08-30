import { PrismaClient } from '@prisma/client';
import env from './env.js';

/** @type {PrismaClient | undefined} */
const globalForPrisma = globalThis;

const prisma =
  globalForPrisma.__prisma ??
  new PrismaClient({
    log: env.isDevelopment ? ['warn', 'error'] : ['error'],
  });

if (!env.isProduction) {
  globalForPrisma.__prisma = prisma;
}

/**
 * Gracefully disconnect Prisma.
 * @returns {Promise<void>}
 */
export async function disconnectPrisma() {
  await prisma.$disconnect();
}

export { prisma };
export default prisma;
