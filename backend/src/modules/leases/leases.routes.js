import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { leasesController as ctrl } from './controller.js';
import {
  createLeaseValidators,
  updateLeaseValidators,
  idParamValidators,
} from './validators.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('leases:read'), asyncHandler(ctrl.list));
router.get('/:id', authorize('leases:read'), idParamValidators, validate, asyncHandler(ctrl.getById));
router.post('/', authorize('leases:create'), createLeaseValidators, validate, asyncHandler(ctrl.create));
router.patch('/:id', authorize('leases:update'), updateLeaseValidators, validate, asyncHandler(ctrl.update));
router.delete('/:id', authorize('leases:delete'), idParamValidators, validate, asyncHandler(ctrl.remove));

export default router;
