import { createCrudController } from '../../lib/crudFactory.js';
import { amenitiesService } from './service.js';

export const amenitiesController = createCrudController(amenitiesService);

export default amenitiesController;
