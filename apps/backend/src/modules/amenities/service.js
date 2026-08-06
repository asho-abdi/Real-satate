import { createCrudService } from '../../lib/crudFactory.js';
import { amenitiesRepository } from './repository.js';

const base = createCrudService(amenitiesRepository, { entityType: 'Amenity' });

const listOptions = {
  filterKeys: ["scope","isActive"],
  allowedSorts: ["createdAt","updatedAt","name"],
};

function normalizePayload(body) {
  return { ...body };
}

export const amenitiesService = {
  ...base,
  list(query) {
    return amenitiesRepository.findMany(query, listOptions);
  },
  create(data, ctx) {
    return base.create(normalizePayload(data), ctx);
  },
  update(id, data, ctx) {
    return base.update(id, normalizePayload(data), ctx);
  },
};

export default amenitiesService;
