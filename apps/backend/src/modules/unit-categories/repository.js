import { createRepository } from '../../lib/crudFactory.js';

export const unitCategoriesRepository = createRepository('unitCategory', {
  softDelete: true,
  searchFields: ["name","description"],
});

export default unitCategoriesRepository;
