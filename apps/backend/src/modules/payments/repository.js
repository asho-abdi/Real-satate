import { createRepository } from '../../lib/crudFactory.js';

export const paymentsRepository = createRepository('payment', {
  softDelete: true,
  searchFields: ['code', 'payerName', 'reference', 'notes'],
  defaultInclude: {
    unit: { select: { id: true, code: true, name: true } },
    lease: { select: { id: true, code: true } },
    reservation: { select: { id: true, code: true } },
    invoice: { select: { id: true, code: true, total: true } },
    receivedBy: { select: { id: true, firstName: true, lastName: true } },
  },
});

export default paymentsRepository;
