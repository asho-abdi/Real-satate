import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { reportsController as ctrl } from './controller.js';
import { exportTypeValidators } from './validators.js';

const router = Router();

router.use(authenticate);

router.get('/dashboard', authorize('reports:read'), asyncHandler(ctrl.dashboard));
router.get('/occupancy', authorize('reports:read'), asyncHandler(ctrl.occupancy));
router.get('/revenue', authorize('reports:read'), asyncHandler(ctrl.revenue));
router.get('/financial', authorize('reports:read'), asyncHandler(ctrl.financial));
router.get('/building', authorize('reports:read'), asyncHandler(ctrl.building));
router.get('/unit', authorize('reports:read'), asyncHandler(ctrl.unit));
router.get('/tenant', authorize('reports:read'), asyncHandler(ctrl.tenant));
router.get('/maintenance', authorize('reports:read'), asyncHandler(ctrl.maintenance));

router.get(
  '/export/excel',
  authorize('reports:export'),
  exportTypeValidators,
  validate,
  asyncHandler(ctrl.exportExcel),
);

router.get(
  '/export/pdf',
  authorize('reports:export'),
  exportTypeValidators,
  validate,
  asyncHandler(ctrl.exportPdf),
);

export default router;
