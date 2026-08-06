import { createRepository } from '../../lib/crudFactory.js';
import prisma from '../../config/database.js';

export const reservationInclude = {
  unit: { select: { id: true, code: true, name: true, status: true, cleaningStatus: true } },
  guest: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
};

export const reservationsRepository = createRepository('reservation', {
  softDelete: true,
  searchFields: ['code', 'notes'],
  defaultInclude: reservationInclude,
});

export async function checkInReservation(id) {
  const reservation = await reservationsRepository.findById(id);
  const now = new Date();

  const [updated] = await prisma.$transaction([
    prisma.reservation.update({
      where: { id },
      data: {
        status: 'CHECKED_IN',
        checkedInAt: now,
      },
      include: reservationInclude,
    }),
    prisma.unit.update({
      where: { id: reservation.unitId },
      data: {
        status: 'OCCUPIED',
        cleaningStatus: 'INSPECTED',
      },
    }),
  ]);

  return updated;
}

export async function checkOutReservation(id) {
  const reservation = await reservationsRepository.findById(id);
  const now = new Date();

  const [updated] = await prisma.$transaction([
    prisma.reservation.update({
      where: { id },
      data: {
        status: 'CHECKED_OUT',
        checkedOutAt: now,
      },
      include: reservationInclude,
    }),
    prisma.unit.update({
      where: { id: reservation.unitId },
      data: {
        status: 'CLEANING',
        cleaningStatus: 'DIRTY',
      },
    }),
  ]);

  return updated;
}

export default reservationsRepository;
