import { createCrudController } from '../../lib/crudFactory.js';
import { commercialTenantsService } from './service.js';

export const commercialTenantsController = createCrudController(commercialTenantsService);

export default commercialTenantsController;
