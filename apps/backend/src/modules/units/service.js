import { createCrudService } from '../../lib/crudFactory.js';
import { writeActivityLog } from '../../utils/audit.js';
import prisma from '../../config/database.js';
import {
  unitsRepository,
  unitInclude,
  addUnitImages,
  deleteUnitImage,
  setPrimaryUnitImage,
} from './repository.js';

const base = createCrudService(unitsRepository, { entityType: 'Unit' });

const listOptions = {
  filterKeys: [
    'status',
    'cleaningStatus',
    'occupancyMode',
    'buildingId',
    'floorId',
    'categoryId',
    'typeId',
    'featured',
  ],
  allowedSorts: [
    'createdAt',
    'updatedAt',
    'code',
    'name',
    'status',
    'rentPrice',
    'dailyRate',
    'areaSqm',
  ],
  include: unitInclude,
};

function normalizePayload(body) {
  const data = { ...body };
  for (const key of ['rentPrice', 'dailyRate', 'areaSqm', 'bathrooms']) {
    if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
      data[key] = Number(data[key]);
    }
  }
  for (const key of ['bedrooms', 'kitchens', 'parking']) {
    if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
      data[key] = Number.parseInt(String(data[key]), 10);
    }
  }
  if (data.amenities !== undefined && typeof data.amenities === 'string') {
    try {
      data.amenities = JSON.parse(data.amenities);
    } catch {
      data.amenities = [];
    }
  }
  return data;
}

export const unitsService = {
  ...base,
  list(query) {
    return unitsRepository.findMany(query, listOptions);
  },
  getById(id) {
    return unitsRepository.findById(id, unitInclude);
  },
  create(data, ctx) {
    return base.create(normalizePayload(data), ctx);
  },
  update(id, data, ctx) {
    return base.update(id, normalizePayload(data), ctx);
  },
  async uploadImages(unitId, files, ctx = {}) {
    const images = await addUnitImages(unitId, files);
    await writeActivityLog(prisma, {
      userId: ctx.userId,
      action: 'UPDATE',
      entityType: 'Unit',
      entityId: unitId,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      meta: { imagesAdded: images.length },
    });
    return images;
  },
  async removeImage(unitId, imageId, ctx = {}) {
    const image = await deleteUnitImage(unitId, imageId);
    await writeActivityLog(prisma, {
      userId: ctx.userId,
      action: 'UPDATE',
      entityType: 'Unit',
      entityId: unitId,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      meta: { imageRemoved: imageId },
    });
    return image;
  },
  async setPrimaryImage(unitId, imageId, ctx = {}) {
    const image = await setPrimaryUnitImage(unitId, imageId);
    await writeActivityLog(prisma, {
      userId: ctx.userId,
      action: 'UPDATE',
      entityType: 'Unit',
      entityId: unitId,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      meta: { primaryImageId: imageId },
    });
    return image;
  },
};

export default unitsService;
