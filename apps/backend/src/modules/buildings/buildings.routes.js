import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { buildingsController as ctrl } from './controller.js';
import {
  createBuildingValidators,
  updateBuildingValidators,
  idParamValidators,
} from './validators.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('buildings:read'), asyncHandler(ctrl.list));
router.get('/:id', authorize('buildings:read'), idParamValidators, validate, asyncHandler(ctrl.getById));
router.post('/', authorize('buildings:create'), createBuildingValidators, validate, asyncHandler(ctrl.create));
router.patch('/:id', authorize('buildings:update'), updateBuildingValidators, validate, asyncHandler(ctrl.update));
router.delete('/:id', authorize('buildings:delete'), idParamValidators, validate, asyncHandler(ctrl.remove));

export default router;
