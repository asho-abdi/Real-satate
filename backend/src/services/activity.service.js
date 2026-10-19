import prisma from '../config/database.js';

/**
 * Record an activity event for unit/lease timelines.
 * Failures are swallowed so they never break the primary write.
 */
export async function logActivity({
  entityType,
  entityId,
  unitId = null,
  action,
  summary,
  meta = null,
  actorId = null,
  tx = prisma,
}) {
  try {
    if (!entityType || !entityId || !action || !summary) return null;
    return await tx.activity.create({
      data: {
        entityType: String(entityType).toUpperCase(),
        entityId,
        unitId: unitId || null,
        action: String(action).toUpperCase(),
        summary: String(summary).trim(),
        meta: meta || undefined,
        actorId: actorId || null,
      },
    });
  } catch {
    return null;
  }
}

export async function listUnitActivity(unitId, { take = 50 } = {}) {
  return prisma.activity.findMany({
    where: { unitId },
    orderBy: { createdAt: 'desc' },
    take,
    include: {
      actor: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });
}
