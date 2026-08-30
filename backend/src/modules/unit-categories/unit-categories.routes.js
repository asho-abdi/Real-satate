import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { unitCategoriesController as ctrl } from './controller.js';
import {
  createUnitCategoryValidators,
  updateUnitCategoryValidators,
  idParamValidators,
} from './validators.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('unit-categories:read'), asyncHandler(ctrl.list));
router.get('/:id', authorize('unit-categories:read'), idParamValidators, validate, asyncHandler(ctrl.getById));
router.post('/', authorize('unit-categories:create'), createUnitCategoryValidators, validate, asyncHandler(ctrl.create));
router.patch('/:id', authorize('unit-categories:update'), updateUnitCategoryValidators, validate, asyncHandler(ctrl.update));
router.delete('/:id', authorize('unit-categories:delete'), idParamValidators, validate, asyncHandler(ctrl.remove));

export default router;
