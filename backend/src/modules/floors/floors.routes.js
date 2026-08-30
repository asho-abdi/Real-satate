import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { floorsController as ctrl } from './controller.js';
import {
  createFloorValidators,
  updateFloorValidators,
  idParamValidators,
} from './validators.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('floors:read'), asyncHandler(ctrl.list));
router.get('/:id', authorize('floors:read'), idParamValidators, validate, asyncHandler(ctrl.getById));
router.post('/', authorize('floors:create'), createFloorValidators, validate, asyncHandler(ctrl.create));
router.patch('/:id', authorize('floors:update'), updateFloorValidators, validate, asyncHandler(ctrl.update));
router.delete('/:id', authorize('floors:delete'), idParamValidators, validate, asyncHandler(ctrl.remove));

export default router;
