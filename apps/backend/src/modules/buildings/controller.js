import { createCrudController } from '../../lib/crudFactory.js';
import { buildingsService } from './service.js';

export const buildingsController = createCrudController(buildingsService);

export default buildingsController;
