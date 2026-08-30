import { createCrudService } from '../../lib/crudFactory.js';
import { floorsRepository } from './repository.js';

const base = createCrudService(floorsRepository, { entityType: 'Floor' });

const listOptions = {
  filterKeys: ["buildingId","isActive"],
  allowedSorts: ["createdAt","updatedAt","floorNumber","name"],
};

function normalizePayload(body) {
  const data = { ...body };
  if (data.floorNumber !== undefined && data.floorNumber !== null && data.floorNumber !== '') {
    data.floorNumber = Number.parseInt(String(data.floorNumber), 10);
  }
  return data;
}

export const floorsService = {
  ...base,
  list(query) {
    return floorsRepository.findMany(query, listOptions);
  },
  create(data, ctx) {
    return base.create(normalizePayload(data), ctx);
  },
  update(id, data, ctx) {
    return base.update(id, normalizePayload(data), ctx);
  },
};

export default floorsService;
