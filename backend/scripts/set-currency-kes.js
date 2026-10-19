import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

await prisma.setting.upsert({
  where: { key: 'currency' },
  update: { value: 'KES' },
  create: { key: 'currency', value: 'KES' },
});

console.log('Currency set to KES (Kenyan Shilling)');
await prisma.$disconnect();
