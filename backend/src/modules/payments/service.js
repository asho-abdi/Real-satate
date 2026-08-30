import { createCrudService } from '../../lib/crudFactory.js';
import { paymentsRepository } from './repository.js';

const base = createCrudService(paymentsRepository, { entityType: 'Payment' });

const listOptions = {
  filterKeys: ['status', 'method', 'type', 'unitId', 'leaseId', 'reservationId', 'invoiceId'],
  allowedSorts: ['createdAt', 'updatedAt', 'paidAt', 'amount', 'code', 'status'],
};

function normalizePayload(body) {
  const data = { ...body };
  if (data.amount !== undefined) data.amount = Number(data.amount);
  if (data.paidAt) data.paidAt = new Date(data.paidAt);
  return data;
}

export const paymentsService = {
  ...base,
  list(query) {
    return paymentsRepository.findMany(query, listOptions);
  },
  create(data, ctx) {
    const payload = normalizePayload(data);
    if (!payload.receivedById && ctx.userId) payload.receivedById = ctx.userId;
    return base.create(payload, ctx);
  },
  update(id, data, ctx) {
    return base.update(id, normalizePayload(data), ctx);
  },
};

export default paymentsService;
