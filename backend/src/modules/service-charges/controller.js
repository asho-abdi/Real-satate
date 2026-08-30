import { createCrudController } from '../../lib/crudFactory.js';
import { serviceChargesService } from './service.js';

export const serviceChargesController = createCrudController(serviceChargesService);

export default serviceChargesController;
