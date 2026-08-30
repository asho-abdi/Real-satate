import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { uploadUnitImages } from '../../middlewares/upload.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { unitsController as ctrl } from './controller.js';
import {
  createUnitValidators,
  updateUnitValidators,
  idParamValidators,
  imageParamValidators,
} from './validators.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('units:read'), asyncHandler(ctrl.list));
router.get('/:id', authorize('units:read'), idParamValidators, validate, asyncHandler(ctrl.getById));
router.post('/', authorize('units:create'), createUnitValidators, validate, asyncHandler(ctrl.create));
router.patch('/:id', authorize('units:update'), updateUnitValidators, validate, asyncHandler(ctrl.update));
router.delete('/:id', authorize('units:delete'), idParamValidators, validate, asyncHandler(ctrl.remove));

router.post(
  '/:id/images',
  authorize('units:update'),
  idParamValidators,
  validate,
  uploadUnitImages.array('images', 20),
  asyncHandler(ctrl.uploadImages),
);

router.delete(
  '/:id/images/:imageId',
  authorize('units:update'),
  imageParamValidators,
  validate,
  asyncHandler(ctrl.removeImage),
);

router.patch(
  '/:id/images/:imageId/primary',
  authorize('units:update'),
  imageParamValidators,
  validate,
  asyncHandler(ctrl.setPrimaryImage),
);

export default router;
