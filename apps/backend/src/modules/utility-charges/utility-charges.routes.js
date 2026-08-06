import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { utilityChargesController as ctrl } from './controller.js';
import {
  createUtilityChargeValidators,
  updateUtilityChargeValidators,
  idParamValidators,
} from './validators.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('utility-charges:read'), asyncHandler(ctrl.list));
router.get('/:id', authorize('utility-charges:read'), idParamValidators, validate, asyncHandler(ctrl.getById));
router.post('/', authorize('utility-charges:create'), createUtilityChargeValidators, validate, asyncHandler(ctrl.create));
router.patch('/:id', authorize('utility-charges:update'), updateUtilityChargeValidators, validate, asyncHandler(ctrl.update));
router.delete('/:id', authorize('utility-charges:delete'), idParamValidators, validate, asyncHandler(ctrl.remove));

export default router;
