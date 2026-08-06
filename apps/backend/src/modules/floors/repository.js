import { createRepository } from '../../lib/crudFactory.js';

export const floorsRepository = createRepository('floor', {
  softDelete: true,
  searchFields: ["name"],
  defaultInclude: {
    building: { select: { id: true, code: true, name: true } },
  },
});

export default floorsRepository;
