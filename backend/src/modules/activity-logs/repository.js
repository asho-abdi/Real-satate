import prisma from '../../config/database.js';
import {
  parsePaginationQuery,
  buildPaginationMeta,
} from '../../utils/pagination.js';

export async function listActivityLogs(query = {}) {
  const parsed = parsePaginationQuery(query, {
    defaultSort: 'createdAt',
    allowedSorts: ['createdAt', 'action', 'entityType'],
    filterKeys: ['action', 'entityType', 'userId', 'entityId'],
  });

  const where = {};
  if (parsed.filters.action) where.action = parsed.filters.action;
  if (parsed.filters.entityType) where.entityType = parsed.filters.entityType;
  if (parsed.filters.userId) where.userId = parsed.filters.userId;
  if (parsed.filters.entityId) where.entityId = parsed.filters.entityId;

  if (parsed.search) {
    where.OR = [
      { action: { contains: parsed.search, mode: 'insensitive' } },
      { entityType: { contains: parsed.search, mode: 'insensitive' } },
      { entityId: { contains: parsed.search, mode: 'insensitive' } },
    ];
  }

  const [total, data] = await Promise.all([
    prisma.activityLog.count({ where }),
    prisma.activityLog.findMany({
      where,
      skip: parsed.skip,
      take: parsed.take,
      orderBy: parsed.orderBy,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    }),
  ]);

  return {
    data,
    meta: buildPaginationMeta(total, { page: parsed.page, limit: parsed.limit }),
  };
}

export default { listActivityLogs };
