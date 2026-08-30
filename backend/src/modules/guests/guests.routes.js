import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { guestsController as ctrl } from './controller.js';
import {
  createGuestValidators,
  updateGuestValidators,
  idParamValidators,
} from './validators.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('guests:read'), asyncHandler(ctrl.list));
router.get('/:id', authorize('guests:read'), idParamValidators, validate, asyncHandler(ctrl.getById));
router.post('/', authorize('guests:create'), createGuestValidators, validate, asyncHandler(ctrl.create));
router.patch('/:id', authorize('guests:update'), updateGuestValidators, validate, asyncHandler(ctrl.update));
router.delete('/:id', authorize('guests:delete'), idParamValidators, validate, asyncHandler(ctrl.remove));

export default router;
