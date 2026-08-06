import { createCrudController } from '../../lib/crudFactory.js';
import { leasesService } from './service.js';

export const leasesController = createCrudController(leasesService);

export default leasesController;
