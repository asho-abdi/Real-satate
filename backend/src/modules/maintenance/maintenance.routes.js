import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { maintenanceController as ctrl } from './controller.js';
import {
  createMaintenanceValidators,
  updateMaintenanceValidators,
  assignMaintenanceValidators,
  idParamValidators,
} from './validators.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('maintenance:read'), asyncHandler(ctrl.list));
router.get('/:id', authorize('maintenance:read'), idParamValidators, validate, asyncHandler(ctrl.getById));
router.post('/', authorize('maintenance:create'), createMaintenanceValidators, validate, asyncHandler(ctrl.create));
router.patch('/:id', authorize('maintenance:update'), updateMaintenanceValidators, validate, asyncHandler(ctrl.update));
router.delete('/:id', authorize('maintenance:delete'), idParamValidators, validate, asyncHandler(ctrl.remove));

router.post(
  '/:id/assign',
  authorize('maintenance:update'),
  assignMaintenanceValidators,
  validate,
  asyncHandler(ctrl.assign),
);

router.post(
  '/:id/close',
  authorize('maintenance:update'),
  idParamValidators,
  validate,
  asyncHandler(ctrl.close),
);

export default router;
