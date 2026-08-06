import { createCrudController } from '../../lib/crudFactory.js';
import { guestsService } from './service.js';

export const guestsController = createCrudController(guestsService);

export default guestsController;
