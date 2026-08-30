import { createCrudService } from '../../lib/crudFactory.js';
import { leasesRepository } from './repository.js';

const base = createCrudService(leasesRepository, { entityType: 'Lease' });

const listOptions = {
  filterKeys: ["status","type","unitId","residentialTenantId","commercialTenantId"],
  allowedSorts: ["createdAt","updatedAt","startDate","endDate","code","status","rentAmount"],
};

function normalizePayload(body) {
  const data = { ...body };
  for (const key of ['rentAmount', 'depositAmount']) {
    if (data[key] !== undefined && data[key] !== null && data[key] !== '') data[key] = Number(data[key]);
  }
  for (const key of ['startDate', 'endDate', 'renewalDate', 'signedAt']) {
    if (data[key]) data[key] = new Date(data[key]);
  }
  if (data.documents !== undefined && typeof data.documents === 'string') {
    try { data.documents = JSON.parse(data.documents); } catch { data.documents = []; }
  }
  return data;
}

export const leasesService = {
  ...base,
  list(query) {
    return leasesRepository.findMany(query, listOptions);
  },
  create(data, ctx) {
    return base.create(normalizePayload(data), ctx);
  },
  update(id, data, ctx) {
    return base.update(id, normalizePayload(data), ctx);
  },
};

export default leasesService;
