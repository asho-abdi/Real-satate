import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import { commercialTenantsController as ctrl } from './controller.js';
import {
  createCommercialTenantValidators,
  updateCommercialTenantValidators,
  idParamValidators,
} from './validators.js';

const router = Router();

router.use(authenticate);

router.get('/', authorize('commercial-tenants:read'), asyncHandler(ctrl.list));
router.get('/:id', authorize('commercial-tenants:read'), idParamValidators, validate, asyncHandler(ctrl.getById));
router.post('/', authorize('commercial-tenants:create'), createCommercialTenantValidators, validate, asyncHandler(ctrl.create));
router.patch('/:id', authorize('commercial-tenants:update'), updateCommercialTenantValidators, validate, asyncHandler(ctrl.update));
router.delete('/:id', authorize('commercial-tenants:delete'), idParamValidators, validate, asyncHandler(ctrl.remove));

export default router;
