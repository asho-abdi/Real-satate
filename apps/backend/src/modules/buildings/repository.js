import { createRepository } from '../../lib/crudFactory.js';

export const buildingsRepository = createRepository('building', {
  softDelete: true,
  searchFields: ["code","name","address","city"],
});

export default buildingsRepository;
