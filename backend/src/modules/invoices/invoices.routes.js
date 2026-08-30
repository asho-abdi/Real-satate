import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { invoicesController as ctrl } from './controller.js';
import {
  createInvoiceValidators,
  updateInvoiceValidators,
  idParamValidators,
} from './validators.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('invoices:read'), asyncHandler(ctrl.list));
router.get('/:id', authorize('invoices:read'), idParamValidators, validate, asyncHandler(ctrl.getById));
router.post('/', authorize('invoices:create'), createInvoiceValidators, validate, asyncHandler(ctrl.create));
router.patch('/:id', authorize('invoices:update'), updateInvoiceValidators, validate, asyncHandler(ctrl.update));
router.delete('/:id', authorize('invoices:delete'), idParamValidators, validate, asyncHandler(ctrl.remove));

export default router;
