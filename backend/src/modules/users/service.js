import { hashPassword } from '../../utils/password.js';
import { writeActivityLog } from '../../utils/audit.js';
import prisma from '../../config/database.js';
import { AppError } from '../../utils/AppError.js';
import * as repo from './repository.js';

function pickUserFields(body, { forCreate = false } = {}) {
  const data = {};
  const fields = ['email', 'firstName', 'lastName', 'phone', 'avatar', 'roleId', 'isActive'];
  for (const key of fields) {
    if (body[key] !== undefined) data[key] = body[key];
  }
  if (data.email) data.email = String(data.email).toLowerCase().trim();
  if (forCreate && !data.email) {
    throw new AppError('email is required', 400);
  }
  return data;
}

export const usersService = {
  list(query) {
    return repo.listUsers(query);
  },
  getById(id) {
    return repo.findUserById(id);
  },
  async create(body, ctx = {}) {
    const data = pickUserFields(body, { forCreate: true });
    if (!body.password) throw new AppError('password is required', 400);
    if (!data.roleId) throw new AppError('roleId is required', 400);
    data.passwordHash = await hashPassword(body.password);
    const created = await repo.createUser(data);
    await writeActivityLog(prisma, {
      userId: ctx.userId,
      action: 'CREATE',
      entityType: 'User',
      entityId: created.id,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return created;
  },
  async update(id, body, ctx = {}) {
    const data = pickUserFields(body);
    if (body.password) {
      data.passwordHash = await hashPassword(body.password);
    }
    const updated = await repo.updateUserRecord(id, data);
    await writeActivityLog(prisma, {
      userId: ctx.userId,
      action: 'UPDATE',
      entityType: 'User',
      entityId: id,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return updated;
  },
  async deactivate(id, ctx = {}) {
    const removed = await repo.deactivateUser(id);
    await writeActivityLog(prisma, {
      userId: ctx.userId,
      action: 'DELETE',
      entityType: 'User',
      entityId: id,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });
    return removed;
  },
};

export default usersService;
