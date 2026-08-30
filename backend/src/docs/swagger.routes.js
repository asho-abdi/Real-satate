import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger.js';

const router = Router();

router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Property Rentals API',
  swaggerOptions: {
    persistAuthorization: true,
    docExpansion: 'list',
    filter: true,
  },
}));

export default router;
