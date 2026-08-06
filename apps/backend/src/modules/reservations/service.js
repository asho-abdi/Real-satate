import { createCrudService } from '../../lib/crudFactory.js';
import { writeActivityLog } from '../../utils/audit.js';
import prisma from '../../config/database.js';
import {
  reservationsRepository,
  checkInReservation,
  checkOutReservation,
} from './repository.js';

const base = createCrudService(reservationsRepository, { entityType: 'Reservation' });

const listOptions = {
  filterKeys: ['status', 'unitId', 'guestId', 'cleaningStatus'],
  allowedSorts: [
    'createdAt',
    'updatedAt',
    'checkInDate',
    'checkOutDate',
    'code',
    'status',
    'totalAmount',
  ],
};

function normalizePayload(body) {
  const data = { ...body };
  for (const key of ['nightlyRate', 'totalAmount']) {
    if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
      data[key] = Number(data[key]);
    }
  }
  for (const key of ['adults', 'children']) {
    if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
      data[key] = Number.parseInt(String(data[key]), 10);
    }
  }
  for (const key of ['checkInDate', 'checkOutDate', 'checkedInAt', 'checkedOutAt']) {
    if (data[key]) data[key] = new Date(data[key]);
  }
  return data;
}

export const reservationsService = {
  ...base,
  list(query) {
    return reservationsRepository.findMany(query, listOptions);
  },
  create(data, ctx) {
    return base.create(normalizePayload(data), ctx);
  },
  update(id, data, ctx) {
    return base.update(id, normalizePayload(data), ctx);
  },
  async checkIn(id, ctx = {}) {
    const row = await checkInReservation(id);
    await writeActivityLog(prisma, {
      userId: ctx.userId,
      action: 'UPDATE',
      entityType: 'Reservation',
      entityId: id,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      meta: { action: 'check-in' },
    });
    return row;
  },
  async checkOut(id, ctx = {}) {
    const row = await checkOutReservation(id);
    await writeActivityLog(prisma, {
      userId: ctx.userId,
      action: 'UPDATE',
      entityType: 'Reservation',
      entityId: id,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      meta: { action: 'check-out' },
    });
    return row;
  },
};

export default reservationsService;
