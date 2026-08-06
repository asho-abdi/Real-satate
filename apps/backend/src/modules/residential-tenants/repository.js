import { createRepository } from '../../lib/crudFactory.js';

export const residentialTenantsRepository = createRepository('residentialTenant', {
  softDelete: true,
  searchFields: ["firstName","lastName","email","phone","idNumber"],
  defaultInclude: {
    unit: { select: { id: true, code: true, name: true, status: true } },
  },
});

export default residentialTenantsRepository;
