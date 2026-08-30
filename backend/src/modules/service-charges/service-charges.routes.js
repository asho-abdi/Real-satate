import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { serviceChargesController as ctrl } from './controller.js';
import {
  createServiceChargeValidators,
  updateServiceChargeValidators,
  idParamValidators,
} from './validators.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('service-charges:read'), asyncHandler(ctrl.list));
router.get('/:id', authorize('service-charges:read'), idParamValidators, validate, asyncHandler(ctrl.getById));
router.post('/', authorize('service-charges:create'), createServiceChargeValidators, validate, asyncHandler(ctrl.create));
router.patch('/:id', authorize('service-charges:update'), updateServiceChargeValidators, validate, asyncHandler(ctrl.update));
router.delete('/:id', authorize('service-charges:delete'), idParamValidators, validate, asyncHandler(ctrl.remove));

export default router;
