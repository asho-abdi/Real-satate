import { createCrudService } from '../../lib/crudFactory.js';
import { unitCategoriesRepository } from './repository.js';

const base = createCrudService(unitCategoriesRepository, { entityType: 'UnitCategory' });

const listOptions = {
  filterKeys: ["occupancyMode","isActive"],
  allowedSorts: ["createdAt","updatedAt","name","baseRate"],
};

function normalizePayload(body) {
  const data = { ...body };
  if (data.baseRate !== undefined && data.baseRate !== null && data.baseRate !== '') {
    data.baseRate = Number(data.baseRate);
  }
  return data;
}

export const unitCategoriesService = {
  ...base,
  list(query) {
    return unitCategoriesRepository.findMany(query, listOptions);
  },
  create(data, ctx) {
    return base.create(normalizePayload(data), ctx);
  },
  update(id, data, ctx) {
    return base.update(id, normalizePayload(data), ctx);
  },
};

export default unitCategoriesService;
