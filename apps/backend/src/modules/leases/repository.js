import { createRepository } from '../../lib/crudFactory.js';

export const leasesRepository = createRepository('lease', {
  softDelete: true,
  searchFields: ["code","terms"],
  defaultInclude: {
    unit: { select: { id: true, code: true, name: true } },
    residentialTenant: { select: { id: true, firstName: true, lastName: true, email: true } },
    commercialTenant: { select: { id: true, companyName: true, contactName: true, email: true } },
  },
});

export default leasesRepository;
