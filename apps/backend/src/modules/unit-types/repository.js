import { createRepository } from '../../lib/crudFactory.js';

export const unitTypesRepository = createRepository('unitType', {
  softDelete: true,
  searchFields: ["name","description"],
});

export default unitTypesRepository;
