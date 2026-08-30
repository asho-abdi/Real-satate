import { createCrudService } from '../../lib/crudFactory.js';
import { commercialTenantsRepository } from './repository.js';

const base = createCrudService(commercialTenantsRepository, { entityType: 'CommercialTenant' });

const listOptions = {
  filterKeys: ["status","unitId"],
  allowedSorts: ["createdAt","updatedAt","companyName","status"],
};

function normalizePayload(body) {
  const data = { ...body };
  if (data.documents !== undefined && typeof data.documents === 'string') {
    try { data.documents = JSON.parse(data.documents); } catch { data.documents = []; }
  }
  return data;
}

export const commercialTenantsService = {
  ...base,
  list(query) {
    return commercialTenantsRepository.findMany(query, listOptions);
  },
  create(data, ctx) {
    return base.create(normalizePayload(data), ctx);
  },
  update(id, data, ctx) {
    return base.update(id, normalizePayload(data), ctx);
  },
};

export default commercialTenantsService;
