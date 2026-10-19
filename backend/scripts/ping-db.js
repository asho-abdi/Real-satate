import prisma from '../src/config/database.js';

try {
  await prisma.$queryRaw`SELECT 1`;
  console.log('db ok');
  process.exit(0);
} catch (err) {
  console.error('db fail', err.message);
  process.exit(1);
}
