import { createRepository } from '../../lib/crudFactory.js';

export const commercialTenantsRepository = createRepository('commercialTenant', {
  softDelete: true,
  searchFields: ["companyName","contactName","email","phone","licenseNumber"],
  defaultInclude: {
    unit: { select: { id: true, code: true, name: true, status: true } },
  },
});

export default commercialTenantsRepository;
