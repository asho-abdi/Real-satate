/**
 * Seed sample test data: 1 building, 4 floors, 4 flats per floor (16 total).
 * Usage: node scripts/seed-sample-flats.js
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const FLOOR_NAMES = ['Ground Floor', 'Floor 1', 'Floor 2', 'Floor 3'];

async function main() {
  console.log('Seeding sample building with 4 floors × 4 flats…');

  const building = await prisma.building.upsert({
    where: { code: 'TEST' },
    update: {
      name: 'Test Building',
      address: 'Nairobi',
      floorsCount: 4,
      notes: 'Sample test data',
      deletedAt: null,
    },
    create: {
      code: 'TEST',
      name: 'Test Building',
      address: 'Nairobi',
      floorsCount: 4,
      notes: 'Sample test data',
    },
  });

  // Soft-delete old floors/units under this building so we can recreate cleanly
  await prisma.unit.updateMany({
    where: { buildingId: building.id, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  await prisma.floor.updateMany({
    where: { buildingId: building.id, deletedAt: null },
    data: { deletedAt: new Date() },
  });

  const unitTypes = ['ONE_BEDROOM', 'TWO_BEDROOM', 'THREE_BEDROOM', 'STUDIO_APARTMENT'];
  const rents = [400, 500, 600, 700];

  for (let level = 0; level < 4; level += 1) {
    const floor = await prisma.floor.create({
      data: {
        buildingId: building.id,
        name: FLOOR_NAMES[level],
        level,
      },
    });

    for (let i = 1; i <= 4; i += 1) {
      const roomNumber = `${level}${String(i).padStart(2, '0')}`; // 001–004, 101–104, …
      await prisma.unit.create({
        data: {
          buildingId: building.id,
          floorId: floor.id,
          roomNumber,
          unitType: unitTypes[i - 1],
          usage: 'APARTMENT',
          roomsCount: i === 4 ? 1 : i, // studio=1, 1bed=1, 2bed=2, 3bed=3 — for flats use i for first three
          bathroomsCount: i <= 2 ? 1 : 2,
          monthlyRent: rents[i - 1],
          discount: 0,
          status: 'AVAILABLE',
        },
      });
    }

    console.log(`  ✓ ${floor.name}: 4 flats`);
  }

  // Fix roomsCount to match unit type better
  const units = await prisma.unit.findMany({
    where: { buildingId: building.id, deletedAt: null },
  });
  for (const u of units) {
    const roomsCount =
      u.unitType === 'STUDIO_APARTMENT'
        ? 1
        : u.unitType === 'ONE_BEDROOM'
          ? 1
          : u.unitType === 'TWO_BEDROOM'
            ? 2
            : 3;
    await prisma.unit.update({
      where: { id: u.id },
      data: { roomsCount },
    });
  }

  console.log('');
  console.log(`Done: ${building.name} (${building.code})`);
  console.log('  4 floors × 4 flats = 16 apartments (Available)');
  console.log('  Open Buildings → Test Building to view them.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
