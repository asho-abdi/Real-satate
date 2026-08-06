import { createRepository } from '../../lib/crudFactory.js';

export const utilityChargesRepository = createRepository('utilityCharge', {
  softDelete: true,
  searchFields: ["code","utilityType","notes"],
  defaultInclude: {
    unit: { select: { id: true, code: true, name: true } },
    invoice: { select: { id: true, code: true, status: true } },
  },
});

export default utilityChargesRepository;
