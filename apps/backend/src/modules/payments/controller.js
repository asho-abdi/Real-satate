import { createCrudController } from '../../lib/crudFactory.js';
import { paymentsService } from './service.js';

export const paymentsController = createCrudController(paymentsService);

export default paymentsController;
