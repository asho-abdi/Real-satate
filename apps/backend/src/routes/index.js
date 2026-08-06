import { Router } from 'express';

import authRoutes from './auth.routes.js';
import buildingsRoutes from '../modules/buildings/routes.js';
import floorsRoutes from '../modules/floors/routes.js';
import unitsRoutes from '../modules/units/routes.js';
import bookingsRoutes from '../modules/bookings/routes.js';
import tenantsRoutes from '../modules/tenants/routes.js';
import businessesRoutes from '../modules/businesses/routes.js';
import paymentsRoutes from '../modules/payments/routes.js';
import reportsRoutes from '../modules/reports/routes.js';
import settingsRoutes from '../modules/settings/routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/buildings', buildingsRoutes);
router.use('/floors', floorsRoutes);
router.use('/units', unitsRoutes);
router.use('/bookings', bookingsRoutes);
router.use('/tenants', tenantsRoutes);
router.use('/businesses', businessesRoutes);
router.use('/payments', paymentsRoutes);
router.use('/reports', reportsRoutes);
router.use('/settings', settingsRoutes);

export default router;
