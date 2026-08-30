import { createRepository } from '../../lib/crudFactory.js';

export const invoicesRepository = createRepository('invoice', {
  softDelete: true,
  searchFields: ['code', 'payerName', 'notes'],
  defaultInclude: {
    unit: { select: { id: true, code: true, name: true } },
    lease: { select: { id: true, code: true, type: true } },
    reservation: { select: { id: true, code: true } },
  },
});

export default invoicesRepository;
