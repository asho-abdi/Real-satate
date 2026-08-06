import { createCrudService } from '../../lib/crudFactory.js';
import { buildingsRepository } from './repository.js';

const base = createCrudService(buildingsRepository, { entityType: 'Building' });

const listOptions = {
  filterKeys: ["city","isActive"],
  allowedSorts: ["createdAt","updatedAt","name","code","city"],
};

function normalizePayload(body) {
  const data = { ...body };
  for (const key of ['floorsCount', 'unitsCount']) {
    if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
      data[key] = Number.parseInt(String(data[key]), 10);
    }
  }
  return data;
}

export const buildingsService = {
  ...base,
  list(query) {
    return buildingsRepository.findMany(query, listOptions);
  },
  create(data, ctx) {
    return base.create(normalizePayload(data), ctx);
  },
  update(id, data, ctx) {
    return base.update(id, normalizePayload(data), ctx);
  },
};

export default buildingsService;
