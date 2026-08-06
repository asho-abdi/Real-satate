import { createCrudService } from '../../lib/crudFactory.js';
import { writeActivityLog } from '../../utils/audit.js';
import prisma from '../../config/database.js';
import {
  maintenanceRepository,
  assignMaintenance,
  closeMaintenance,
} from './repository.js';

const base = createCrudService(maintenanceRepository, { entityType: 'MaintenanceRequest' });

const listOptions = {
  filterKeys: ['status', 'priority', 'buildingId', 'unitId', 'technicianId', 'assigneeId'],
  allowedSorts: ['createdAt', 'updatedAt', 'openedAt', 'priority', 'status', 'code'],
};

function normalizePayload(body) {
  const data = { ...body };
  if (data.cost !== undefined && data.cost !== null && data.cost !== '') {
    data.cost = Number(data.cost);
  }
  for (const key of ['openedAt', 'resolvedAt', 'closedAt']) {
    if (data[key]) data[key] = new Date(data[key]);
  }
  return data;
}

export const maintenanceService = {
  ...base,
  list(query) {
    return maintenanceRepository.findMany(query, listOptions);
  },
  create(data, ctx) {
    return base.create(normalizePayload(data), ctx);
  },
  update(id, data, ctx) {
    return base.update(id, normalizePayload(data), ctx);
  },
  async assign(id, body, ctx = {}) {
    const row = await assignMaintenance(id, {
      technicianId: body.technicianId,
      assigneeId: body.assigneeId,
    });
    await writeActivityLog(prisma, {
      userId: ctx.userId,
      action: 'UPDATE',
      entityType: 'MaintenanceRequest',
      entityId: id,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      meta: { action: 'assign', technicianId: body.technicianId },
    });
    return row;
  },
  async close(id, ctx = {}) {
    const row = await closeMaintenance(id);
    await writeActivityLog(prisma, {
      userId: ctx.userId,
      action: 'UPDATE',
      entityType: 'MaintenanceRequest',
      entityId: id,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      meta: { action: 'close' },
    });
    return row;
  },
};

export default maintenanceService;
