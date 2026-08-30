import { createCrudController } from '../../lib/crudFactory.js';
import { floorsService } from './service.js';

export const floorsController = createCrudController(floorsService);

export default floorsController;
