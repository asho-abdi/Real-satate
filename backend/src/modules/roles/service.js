import { writeActivityLog } from '../../utils/audit.js';
import prisma from '../../config/database.js';
import * as repo from './repository.js';

export const rolesService = {
  list(query) {
    return repo.listRoles(query);
  },
  getById(id) {
    return repo.findRoleById(id);
  },
  async updatePermissions(id, permissionIds, ctx = {}) {
    const updated = await repo.updateRolePermissions(id, permissionIds);
    await writeActivityLog(prisma, {
      userId: ctx.userId,
      action: 'UPDATE',
      entityType: 'Role',
      entityId: id,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      meta: { permissionCount: permissionIds?.length },
    });
    return updated;
  },
};

export default rolesService;
