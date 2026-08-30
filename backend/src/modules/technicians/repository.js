import { createRepository } from '../../lib/crudFactory.js';

export const techniciansRepository = createRepository('technician', {
  softDelete: true,
  searchFields: ["firstName","lastName","email","phone","specialization"],
  defaultInclude: {
    user: { select: { id: true, email: true, firstName: true, lastName: true } },
  },
});

export default techniciansRepository;
