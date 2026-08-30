import { createRepository } from '../../lib/crudFactory.js';

export const amenitiesRepository = createRepository('amenity', {
  softDelete: true,
  searchFields: ["name","description"],
});

export default amenitiesRepository;
