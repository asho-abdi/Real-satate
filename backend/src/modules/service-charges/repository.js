import { createRepository } from '../../lib/crudFactory.js';

export const serviceChargesRepository = createRepository('serviceCharge', {
  softDelete: true,
  searchFields: ["code","description","notes"],
  defaultInclude: {
    unit: { select: { id: true, code: true, name: true } },
    invoice: { select: { id: true, code: true, status: true } },
  },
});

export default serviceChargesRepository;
