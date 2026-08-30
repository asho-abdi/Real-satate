import { createCrudService } from '../../lib/crudFactory.js';
import { serviceChargesRepository } from './repository.js';

const base = createCrudService(serviceChargesRepository, { entityType: 'ServiceCharge' });

const listOptions = {
  filterKeys: ["status","unitId","invoiceId"],
  allowedSorts: ["createdAt","updatedAt","amount","periodStart","periodEnd","code"],
};

function normalizePayload(body) {
  const data = { ...body };
  if (data.amount !== undefined && data.amount !== null) data.amount = Number(data.amount);
  if (data.periodStart) data.periodStart = new Date(data.periodStart);
  if (data.periodEnd) data.periodEnd = new Date(data.periodEnd);
  return data;
}

export const serviceChargesService = {
  ...base,
  list(query) {
    return serviceChargesRepository.findMany(query, listOptions);
  },
  create(data, ctx) {
    return base.create(normalizePayload(data), ctx);
  },
  update(id, data, ctx) {
    return base.update(id, normalizePayload(data), ctx);
  },
};

export default serviceChargesService;
