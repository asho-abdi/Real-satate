import { createCrudController } from '../../lib/crudFactory.js';
import { utilityChargesService } from './service.js';

export const utilityChargesController = createCrudController(utilityChargesService);

export default utilityChargesController;
