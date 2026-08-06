import { createRepository } from '../../lib/crudFactory.js';
import prisma from '../../config/database.js';

export const maintenanceInclude = {
  building: { select: { id: true, code: true, name: true } },
  unit: { select: { id: true, code: true, name: true } },
  technician: { select: { id: true, firstName: true, lastName: true, specialization: true } },
  assignee: { select: { id: true, firstName: true, lastName: true, email: true } },
};

export const maintenanceRepository = createRepository('maintenanceRequest', {
  softDelete: true,
  searchFields: ['code', 'title', 'description'],
  defaultInclude: maintenanceInclude,
});

export async function assignMaintenance(id, { technicianId, assigneeId }) {
  await maintenanceRepository.findById(id);
  return prisma.maintenanceRequest.update({
    where: { id },
    data: {
      technicianId,
      ...(assigneeId !== undefined ? { assigneeId } : {}),
      status: 'ASSIGNED',
    },
    include: maintenanceInclude,
  });
}

export async function closeMaintenance(id) {
  await maintenanceRepository.findById(id);
  return prisma.maintenanceRequest.update({
    where: { id },
    data: {
      status: 'CLOSED',
      closedAt: new Date(),
    },
    include: maintenanceInclude,
  });
}

export default maintenanceRepository;
