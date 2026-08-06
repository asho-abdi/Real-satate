import { createCrudService } from '../../lib/crudFactory.js';
import { invoicesRepository } from './repository.js';

const base = createCrudService(invoicesRepository, { entityType: 'Invoice' });

const listOptions = {
  filterKeys: ['status', 'unitId', 'leaseId', 'reservationId'],
  allowedSorts: ['createdAt', 'updatedAt', 'issueDate', 'dueDate', 'total', 'code', 'status'],
};

function normalizePayload(body) {
  const data = { ...body };
  for (const key of ['subtotal', 'tax', 'total', 'balance']) {
    if (data[key] !== undefined && data[key] !== null) data[key] = Number(data[key]);
  }
  if (data.issueDate) data.issueDate = new Date(data.issueDate);
  if (data.dueDate) data.dueDate = new Date(data.dueDate);
  return data;
}

export const invoicesService = {
  ...base,
  list(query) {
    return invoicesRepository.findMany(query, listOptions);
  },
  create(data, ctx) {
    return base.create(normalizePayload(data), ctx);
  },
  update(id, data, ctx) {
    return base.update(id, normalizePayload(data), ctx);
  },
};

export default invoicesService;
