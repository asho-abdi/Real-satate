import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const result = await prisma.$executeRawUnsafe(`
  UPDATE "Booking"
  SET "periodRate" = "dailyRent",
      "periodQuantity" = GREATEST("nights", 1)
  WHERE "periodRate" = 0
`);

console.log('Backfilled bookings:', result);
await prisma.$disconnect();
