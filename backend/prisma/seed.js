import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearAll() {
  await prisma.monthlyPayment.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.business.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.floor.deleteMany();
  await prisma.building.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  console.log('Seeding Property Rentals (clean start)…');
  await clearAll();

  const passwordHash = await bcrypt.hash('Admin@12345', 12);

  await prisma.user.create({
    data: {
      email: 'admin@estateops.com',
      passwordHash,
      firstName: 'Admin',
      lastName: 'Owner',
      role: 'ADMIN',
      isActive: true,
    },
  });

  await prisma.setting.createMany({
    data: [
      { key: 'app.name', value: 'Property Rentals' },
      { key: 'currency', value: 'USD' },
    ],
  });

  console.log('Seed complete — empty database ready for admin setup.');
  console.log('  Admin: admin@estateops.com / Admin@12345');
  console.log('  Next: sign in → Buildings → add floors → add rooms (choose Shop / Apartment / Guest).');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
