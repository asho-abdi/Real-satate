import { createCrudController } from '../../lib/crudFactory.js';
import { residentialTenantsService } from './service.js';

export const residentialTenantsController = createCrudController(residentialTenantsService);

export default residentialTenantsController;
