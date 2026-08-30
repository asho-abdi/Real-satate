import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { unitTypesController as ctrl } from './controller.js';
import {
  createUnitTypeValidators,
  updateUnitTypeValidators,
  idParamValidators,
} from './validators.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('unit-types:read'), asyncHandler(ctrl.list));
router.get('/:id', authorize('unit-types:read'), idParamValidators, validate, asyncHandler(ctrl.getById));
router.post('/', authorize('unit-types:create'), createUnitTypeValidators, validate, asyncHandler(ctrl.create));
router.patch('/:id', authorize('unit-types:update'), updateUnitTypeValidators, validate, asyncHandler(ctrl.update));
router.delete('/:id', authorize('unit-types:delete'), idParamValidators, validate, asyncHandler(ctrl.remove));

export default router;
