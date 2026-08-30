import { createCrudController } from '../../lib/crudFactory.js';
import { techniciansService } from './service.js';

export const techniciansController = createCrudController(techniciansService);

export default techniciansController;
