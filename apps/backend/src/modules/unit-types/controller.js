import { createCrudController } from '../../lib/crudFactory.js';
import { unitTypesService } from './service.js';

export const unitTypesController = createCrudController(unitTypesService);

export default unitTypesController;
