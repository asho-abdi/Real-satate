import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { amenitiesController as ctrl } from './controller.js';
import {
  createAmenityValidators,
  updateAmenityValidators,
  idParamValidators,
} from './validators.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('amenities:read'), asyncHandler(ctrl.list));
router.get('/:id', authorize('amenities:read'), idParamValidators, validate, asyncHandler(ctrl.getById));
router.post('/', authorize('amenities:create'), createAmenityValidators, validate, asyncHandler(ctrl.create));
router.patch('/:id', authorize('amenities:update'), updateAmenityValidators, validate, asyncHandler(ctrl.update));
router.delete('/:id', authorize('amenities:delete'), idParamValidators, validate, asyncHandler(ctrl.remove));

export default router;
