import { AppError } from '../../utils/AppError.js';
import { writeActivityLog } from '../../utils/audit.js';
import prisma from '../../config/database.js';
import { settingsRepository, findSettingByKey, upsertSetting } from './repository.js';

export const settingsService = {
  list(query) {
    return settingsRepository.findMany(query, {
      filterKeys: ['group'],
      allowedSorts: ['key', 'group', 'createdAt', 'updatedAt'],
    });
  },
  async getByKey(key) {
    const row = await findSettingByKey(key);
    if (!row) throw new AppError('Setting not found', 404, { code: 'NOT_FOUND' });
    return row;
  },
  async upsert(key, data, ctx = {}) {
    const row = await upsertSetting(key, data);
    await writeActivityLog(prisma, {
      userId: ctx.userId,
      action: 'UPDATE',
      entityType: 'Setting',
      entityId: row.id,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      meta: { key },
    });
    return row;
  },
};

export default settingsService;
