import { createRepository } from '../../lib/crudFactory.js';

export const guestsRepository = createRepository('guest', {
  softDelete: true,
  searchFields: ["firstName","lastName","email","phone","idNumber"],
});

export default guestsRepository;
