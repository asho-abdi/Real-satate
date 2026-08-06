import { createCrudController } from '../../lib/crudFactory.js';
import { invoicesService } from './service.js';

export const invoicesController = createCrudController(invoicesService);

export default invoicesController;
