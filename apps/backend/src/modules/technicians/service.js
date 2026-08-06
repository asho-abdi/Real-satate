import { createCrudService } from '../../lib/crudFactory.js';
import { techniciansRepository } from './repository.js';

const base = createCrudService(techniciansRepository, { entityType: 'Technician' });

const listOptions = {
  filterKeys: ["isActive"],
  allowedSorts: ["createdAt","updatedAt","firstName","lastName"],
};

function normalizePayload(body) {
  return { ...body };
}

export const techniciansService = {
  ...base,
  list(query) {
    return techniciansRepository.findMany(query, listOptions);
  },
  create(data, ctx) {
    return base.create(normalizePayload(data), ctx);
  },
  update(id, data, ctx) {
    return base.update(id, normalizePayload(data), ctx);
  },
};

export default techniciansService;
