import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { paymentsController as ctrl } from './controller.js';
import {
  createPaymentValidators,
  updatePaymentValidators,
  idParamValidators,
} from './validators.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('payments:read'), asyncHandler(ctrl.list));
router.get('/:id', authorize('payments:read'), idParamValidators, validate, asyncHandler(ctrl.getById));
router.post('/', authorize('payments:create'), createPaymentValidators, validate, asyncHandler(ctrl.create));
router.patch('/:id', authorize('payments:update'), updatePaymentValidators, validate, asyncHandler(ctrl.update));
router.delete('/:id', authorize('payments:delete'), idParamValidators, validate, asyncHandler(ctrl.remove));

export default router;
