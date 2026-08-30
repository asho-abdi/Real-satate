import { createCrudService } from '../../lib/crudFactory.js';
import { residentialTenantsRepository } from './repository.js';

const base = createCrudService(residentialTenantsRepository, { entityType: 'ResidentialTenant' });

const listOptions = {
  filterKeys: ["status","unitId"],
  allowedSorts: ["createdAt","updatedAt","firstName","lastName","status"],
};

function normalizePayload(body) {
  const data = { ...body };
  if (data.moveInDate) data.moveInDate = new Date(data.moveInDate);
  if (data.moveOutDate) data.moveOutDate = new Date(data.moveOutDate);
  if (data.documents !== undefined && typeof data.documents === 'string') {
    try { data.documents = JSON.parse(data.documents); } catch { data.documents = []; }
  }
  return data;
}

export const residentialTenantsService = {
  ...base,
  list(query) {
    return residentialTenantsRepository.findMany(query, listOptions);
  },
  create(data, ctx) {
    return base.create(normalizePayload(data), ctx);
  },
  update(id, data, ctx) {
    return base.update(id, normalizePayload(data), ctx);
  },
};

export default residentialTenantsService;
