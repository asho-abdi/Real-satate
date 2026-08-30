import { createCrudService } from '../../lib/crudFactory.js';
import { guestsRepository } from './repository.js';

const base = createCrudService(guestsRepository, { entityType: 'Guest' });

const listOptions = {
  filterKeys: [],
  allowedSorts: ["createdAt","updatedAt","firstName","lastName"],
};

function normalizePayload(body) {
  return { ...body };
}

export const guestsService = {
  ...base,
  list(query) {
    return guestsRepository.findMany(query, listOptions);
  },
  create(data, ctx) {
    return base.create(normalizePayload(data), ctx);
  },
  update(id, data, ctx) {
    return base.update(id, normalizePayload(data), ctx);
  },
};

export default guestsService;
