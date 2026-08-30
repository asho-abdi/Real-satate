import { createCrudService } from '../../lib/crudFactory.js';
import { unitTypesRepository } from './repository.js';

const base = createCrudService(unitTypesRepository, { entityType: 'UnitType' });

const listOptions = {
  filterKeys: ["occupancyMode","isActive"],
  allowedSorts: ["createdAt","updatedAt","name"],
};

function normalizePayload(body) {
  return { ...body };
}

export const unitTypesService = {
  ...base,
  list(query) {
    return unitTypesRepository.findMany(query, listOptions);
  },
  create(data, ctx) {
    return base.create(normalizePayload(data), ctx);
  },
  update(id, data, ctx) {
    return base.update(id, normalizePayload(data), ctx);
  },
};

export default unitTypesService;
