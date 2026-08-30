import prisma from '../../config/database.js';
import { AppError } from '../../utils/AppError.js';
import {
  parsePaginationQuery,
  buildPaginationMeta,
} from '../../utils/pagination.js';

export async function listNotificationsForUser(userId, query = {}) {
  const parsed = parsePaginationQuery(query, {
    defaultSort: 'createdAt',
    allowedSorts: ['createdAt', 'updatedAt', 'type'],
    filterKeys: ['type', 'unread'],
  });

  const where = { userId };
  if (parsed.filters.type) where.type = parsed.filters.type;
  if (parsed.filters.unread === 'true' || parsed.filters.unread === true) {
    where.readAt = null;
  }

  const [total, data] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      skip: parsed.skip,
      take: parsed.take,
      orderBy: parsed.orderBy,
    }),
  ]);

  return {
    data,
    meta: buildPaginationMeta(total, { page: parsed.page, limit: parsed.limit }),
  };
}

export async function markNotificationRead(id, userId) {
  const row = await prisma.notification.findFirst({ where: { id, userId } });
  if (!row) throw new AppError('Notification not found', 404, { code: 'NOT_FOUND' });
  return prisma.notification.update({
    where: { id },
    data: { readAt: new Date() },
  });
}

export async function markAllNotificationsRead(userId) {
  const result = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });
  return { count: result.count };
}

export default {
  listNotificationsForUser,
  markNotificationRead,
  markAllNotificationsRead,
};
