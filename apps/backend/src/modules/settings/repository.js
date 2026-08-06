import { createRepository } from '../../lib/crudFactory.js';
import prisma from '../../config/database.js';

export const settingsRepository = createRepository('setting', {
  softDelete: false,
  searchFields: ['key', 'description', 'group'],
});

export async function findSettingByKey(key) {
  return prisma.setting.findUnique({ where: { key } });
}

export async function upsertSetting(key, data) {
  return prisma.setting.upsert({
    where: { key },
    create: {
      key,
      value: data.value,
      group: data.group || 'general',
      description: data.description ?? null,
    },
    update: {
      value: data.value,
      ...(data.group !== undefined ? { group: data.group } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
    },
  });
}

export default settingsRepository;
