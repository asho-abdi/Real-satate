import { createCrudController } from '../../lib/crudFactory.js';
import { unitCategoriesService } from './service.js';

export const unitCategoriesController = createCrudController(unitCategoriesService);

export default unitCategoriesController;
